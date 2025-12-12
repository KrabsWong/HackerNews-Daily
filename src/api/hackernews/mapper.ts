/**
 * API type mappers
 * Functions to convert between different API response formats
 */

import { AlgoliaStory, HNStory } from '../../types/api';

/**
 * Map Algolia story response to HNStory interface
 */
export function mapAlgoliaStoryToHNStory(algoliaStory: AlgoliaStory): HNStory {
  return {
    id: algoliaStory.story_id,
    title: algoliaStory.title,
    url: algoliaStory.url,
    score: algoliaStory.points,
    time: algoliaStory.created_at_i,
    type: 'story',
    by: algoliaStory.author,
    // kids field not provided by Algolia search endpoint
    // will be fetched separately if needed for comments
  };
}
