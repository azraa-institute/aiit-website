import { Layout } from '@/components/layout/Layout';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { HeroSlideshow } from '@/components/home/HeroSlideshow';
import { VisionTransition } from '@/components/home/VisionTransition';
import { TechnologyDomains } from '@/components/home/TechnologyDomains';
import { LearningEcosystem } from '@/components/home/LearningEcosystem';
import { FeaturedCourses } from '@/components/home/FeaturedCourses';
import { Partners } from '@/components/home/Partners';
import { WebinarSpotlight } from '@/components/home/WebinarSpotlight';
import { StudentStories } from '@/components/home/StudentStories';
import { ResourcesTeaser } from '@/components/home/ResourcesTeaser';
import { NewsletterBand } from '@/components/home/NewsletterBand';

export default function HomePage() {
  useScrollReveal();

  return (
    <Layout heroPage>
      <Seo
        path="/"
        jsonLd={[
          organizationLd(),
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'AIIT',
            url: 'https://aiit.network/',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://aiit.network/courses?q={query}',
              'query-input': 'required name=query',
            },
          },
        ]}
      />
      <HeroSlideshow />
      <TechnologyDomains />
      <FeaturedCourses />
      <Partners />
      <NewsletterBand />
      <LearningEcosystem />
      <VisionTransition />
      <StudentStories />
      <WebinarSpotlight />
      <ResourcesTeaser />
    </Layout>
  );
}
