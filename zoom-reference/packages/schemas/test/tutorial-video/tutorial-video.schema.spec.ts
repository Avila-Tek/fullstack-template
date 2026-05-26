import { describe, expect, it } from 'vitest';
import {
  GetPublicTutorialVideoResponseSchema,
  TutorialVideoItemSchema,
} from '../../src/tutorial-video/tutorial-video.schema';

describe('TutorialVideoItemSchema', () => {
  it('accepts valid tutorial video item', () => {
    const video = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      section_key: 'public_home',
      title: 'Getting Started',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = TutorialVideoItemSchema.safeParse(video);
    expect(result.success).toBe(true);
  });

  it('rejects invalid youtube_url', () => {
    const video = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      section_key: 'public_home',
      title: 'Getting Started',
      youtube_url: 'https://example.com/video',
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = TutorialVideoItemSchema.safeParse(video);
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const video = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      section_key: 'public_home',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = TutorialVideoItemSchema.safeParse(video);
    expect(result.success).toBe(false);
  });

  it('accepts youtu.be URLs', () => {
    const video = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      section_key: 'public_home',
      title: 'Getting Started',
      youtube_url: 'https://youtu.be/dQw4w9WgXcQ',
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = TutorialVideoItemSchema.safeParse(video);
    expect(result.success).toBe(true);
  });
});

describe('GetPublicTutorialVideoResponseSchema', () => {
  it('accepts response with valid video', () => {
    const response = {
      video: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        section_key: 'public_home',
        title: 'Getting Started',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    const result = GetPublicTutorialVideoResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('accepts response with null video', () => {
    const response = { video: null };
    const result = GetPublicTutorialVideoResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
