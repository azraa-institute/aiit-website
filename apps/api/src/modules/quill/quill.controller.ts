import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { QuillChatResponse } from '@aiit/shared';
import { QuillService } from './quill.service';
import { QuillChatDto } from './dto/quill-chat.dto';

// Public, no JwtGuard -- Quill answers prospective students who aren't
// signed in yet, the whole point of it sitting on the public course page.
// The throttle is deliberately tighter than most public endpoints: today
// it only bounds abuse of a free rule-based engine, but it's the same
// limit that will cap real per-message LLM cost once XAI_API_KEY is wired
// in (see QuillService's doc comment) -- worth revisiting that number
// again at that point, not just leaving it at a value chosen for a
// zero-cost engine.
@Controller('quill')
@Throttle({ default: { limit: 12, ttl: 60_000 } })
export class QuillController {
  constructor(private readonly quill: QuillService) {}

  @Post('chat')
  async chat(@Body() dto: QuillChatDto, @Req() request: Request): Promise<QuillChatResponse> {
    return this.quill.respond(dto, request.headers);
  }
}
