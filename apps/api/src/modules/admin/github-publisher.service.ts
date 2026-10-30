import { Injectable, Logger } from '@nestjs/common';

const API_BASE = 'https://api.github.com';

export interface GithubCommitResult {
  /** The committed file's own blob sha -- pass back in as `previousSha` on the next update. */
  fileSha: string;
  commitSha: string;
  commitUrl: string;
}

/**
 * Thin hand-rolled wrapper over GitHub's REST Contents API -- no Octokit SDK
 * dependency, matching this codebase's existing house style for third-party
 * HTTP integrations (SupabaseAdminService, the PayPal/Razorpay/Paystack
 * clients: "thin REST clients, no SDKs").
 *
 * code/retryable on GithubPublishError is what AdminBlogService surfaces to
 * the admin UI as a persistent error banner -- never silently swallowed, and
 * the DB row's status/publishedAt is never touched unless a call here
 * actually resolves.
 */
export class GithubPublishError extends Error {
  constructor(
    public readonly code: 'auth' | 'conflict' | 'rate_limited' | 'network' | 'unknown',
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

@Injectable()
export class GithubPublisherService {
  private readonly logger = new Logger(GithubPublisherService.name);

  isConfigured(): boolean {
    return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  }

  private get repo(): string {
    return process.env.GITHUB_REPO ?? '';
  }

  private get branch(): string {
    return process.env.GITHUB_BRANCH || 'main';
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.isConfigured()) {
      throw new GithubPublishError('auth', 'Publishing is not configured on this server (GITHUB_TOKEN/GITHUB_REPO missing).', false);
    }
    try {
      return await fetch(`${API_BASE}/repos/${this.repo}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch (err) {
      this.logger.error('Could not reach GitHub', err instanceof Error ? err.stack : String(err));
      throw new GithubPublishError('network', 'Could not reach GitHub. Check the connection and try again.', true);
    }
  }

  /** The file's current blob sha, or null if it doesn't exist yet at this path. */
  async getFileSha(path: string): Promise<string | null> {
    const res = await this.request(`/contents/${encodeGithubPath(path)}?ref=${this.branch}`);
    if (res.status === 404) return null;
    if (!res.ok) await this.throwForStatus(res);
    const body = (await res.json()) as { sha: string };
    return body.sha;
  }

  /** Filenames in a repo directory -- used for a slug-collision check against whatever's actually live, not just what the DB knows about. */
  async listDir(dirPath: string): Promise<string[]> {
    const res = await this.request(`/contents/${encodeGithubPath(dirPath)}?ref=${this.branch}`);
    if (res.status === 404) return [];
    if (!res.ok) await this.throwForStatus(res);
    const body = (await res.json()) as { name: string }[];
    return Array.isArray(body) ? body.map((f) => f.name) : [];
  }

  async putFile(path: string, content: Buffer, message: string, previousSha?: string | null): Promise<GithubCommitResult> {
    const res = await this.request(`/contents/${encodeGithubPath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: content.toString('base64'),
        branch: this.branch,
        ...(previousSha ? { sha: previousSha } : {}),
      }),
    });
    if (!res.ok) await this.throwForStatus(res);
    const body = (await res.json()) as { content: { sha: string }; commit: { sha: string; html_url: string } };
    return { fileSha: body.content.sha, commitSha: body.commit.sha, commitUrl: body.commit.html_url };
  }

  async deleteFile(path: string, sha: string, message: string): Promise<void> {
    const res = await this.request(`/contents/${encodeGithubPath(path)}`, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: this.branch }),
    });
    if (!res.ok && res.status !== 404) await this.throwForStatus(res);
  }

  private async throwForStatus(res: Response): Promise<never> {
    const text = await res.text().catch(() => '');
    this.logger.error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
    if (res.status === 401 || res.status === 403) {
      throw new GithubPublishError('auth', 'GitHub rejected the request. Check GITHUB_TOKEN permissions.', false);
    }
    if (res.status === 409) {
      throw new GithubPublishError('conflict', 'That file changed on GitHub since this was last loaded here. Reload and try again.', true);
    }
    if (res.status === 429) {
      throw new GithubPublishError('rate_limited', 'GitHub rate-limited this request. Try again in a minute.', true);
    }
    throw new GithubPublishError('unknown', 'GitHub rejected the request.', true);
  }
}

function encodeGithubPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
