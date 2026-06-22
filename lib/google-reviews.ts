import { cacheLife } from 'next/cache'

export type PlaceReview = {
  author_name: string
  rating: number
  text: string
  relative_time_description: string
}

export type PlaceReviews = {
  rating: number
  user_ratings_total: number
  reviews: PlaceReview[]
}

const PLACE_ID = 'ChIJ0SaBgEwxwUcRnlbIUVNWILo'

export async function getGoogleReviews(): Promise<PlaceReviews | null> {
  'use cache'
  cacheLife('days')

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('[KOB Reviews] GOOGLE_PLACES_API_KEY not set')
    return null
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', PLACE_ID)
    url.searchParams.set('fields', 'rating,user_ratings_total,reviews')
    url.searchParams.set('language', 'nl')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    if (!res.ok) {
      console.error(`[KOB Reviews] HTTP error: ${res.status}`)
      return null
    }

    const data = await res.json() as {
      status: string
      result?: {
        rating?: number
        user_ratings_total?: number
        reviews?: PlaceReview[]
      }
    }

    if (data.status !== 'OK' || !data.result) {
      console.error(`[KOB Reviews] Places API status: ${data.status}`)
      return null
    }

    return {
      rating:              data.result.rating              ?? 0,
      user_ratings_total:  data.result.user_ratings_total  ?? 0,
      reviews:            (data.result.reviews             ?? []).slice(0, 5),
    }
  } catch (err) {
    console.error('[KOB Reviews] Fetch failed:', err)
    return null
  }
}
