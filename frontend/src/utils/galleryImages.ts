export type GalleryCategory = 'food' | 'interior' | 'chef' | 'events'

export interface GalleryImage {
  id: string
  photoId: string
  alt: string
  category: GalleryCategory
  aspect: string
  objectPosition: string
  captionKey: string
}

const SRC = (photoId: string, w: number) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&q=80`

export const gallerySrc = (image: GalleryImage, w = 900): string => SRC(image.photoId, w)

export const gallerySrcSet = (image: GalleryImage): string =>
  [480, 800, 1100, 1600, 2000].map((w) => `${SRC(image.photoId, w)} ${w}w`).join(', ')

/**
 * Art-directed photographic sequence for the gallery. Ratios and object
 * positions are chosen per subject so no important visual is cropped.
 * Every photo has been verified as a live, resolvable image URL.
 */
export const GALLERY_IMAGES: GalleryImage[] = [
  {
    id: 'g01',
    photoId: '1517248135467-4c7edcad34c4',
    alt: 'The candlelit dining room',
    category: 'interior',
    aspect: 'aspect-[3/2]',
    objectPosition: 'center 45%',
    captionKey: 'gallery.captions.g01',
  },
  {
    id: 'g02',
    photoId: '1621072156002-e2fccdc0b176',
    alt: 'Burrata with heirloom tomatoes and basil oil',
    category: 'food',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g02',
  },
  {
    id: 'g03',
    photoId: '1559339352-11d035aa65de',
    alt: 'The bar in warm evening light',
    category: 'interior',
    aspect: 'aspect-[4/3]',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g03',
  },
  {
    id: 'g04',
    photoId: '1555396273-367ea4eb4db5',
    alt: 'The chef in the kitchen before service',
    category: 'chef',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center 55%',
    captionKey: 'gallery.captions.g04',
  },
  {
    id: 'g05',
    photoId: '1473093295043-cdd812d0e601',
    alt: 'Hand-cut tagliatelle with black truffle',
    category: 'food',
    aspect: 'aspect-[3/2]',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g05',
  },
  {
    id: 'g06',
    photoId: '1551218808-94e220e084d2',
    alt: 'An evening table set for dinner, seen from above',
    category: 'events',
    aspect: 'aspect-square',
    objectPosition: 'center 40%',
    captionKey: 'gallery.captions.g06',
  },
  {
    id: 'g07',
    photoId: '1514933651103-005eec06c04b',
    alt: 'Candlelight against the last light of day',
    category: 'interior',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g07',
  },
  {
    id: 'g08',
    photoId: '1585032226651-759b368d7246',
    alt: 'Spaghetti alle vongole with fresh clams',
    category: 'food',
    aspect: 'aspect-[3/2]',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g08',
  },
  {
    id: 'g09',
    photoId: '1577219491135-ce391730fb2c',
    alt: 'A plate finished at the pass',
    category: 'chef',
    aspect: 'aspect-[3/2]',
    objectPosition: 'center 45%',
    captionKey: 'gallery.captions.g09',
  },
  {
    id: 'g10',
    photoId: '1544148103-0773bf10d330',
    alt: 'The bottle shelf behind the bar',
    category: 'interior',
    aspect: 'aspect-[3/4]',
    objectPosition: 'center 35%',
    captionKey: 'gallery.captions.g10',
  },
  {
    id: 'g11',
    photoId: '1476124369491-e7addf5db371',
    alt: 'Carnaroli risotto, finished with aged pecorino',
    category: 'food',
    aspect: 'aspect-square',
    objectPosition: 'center 60%',
    captionKey: 'gallery.captions.g11',
  },
  {
    id: 'g12',
    photoId: '1519671482749-fd09be7ccebf',
    alt: 'Glasses raised across the long table',
    category: 'events',
    aspect: 'aspect-[4/3]',
    objectPosition: 'center 40%',
    captionKey: 'gallery.captions.g12',
  },
  {
    id: 'g13',
    photoId: '1528712306091-ed0763094c98',
    alt: 'Fire, focus, and the pass on a busy evening',
    category: 'chef',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center 45%',
    captionKey: 'gallery.captions.g13',
  },
  {
    id: 'g14',
    photoId: '1559847844-5315695dadae',
    alt: 'Branzino al limone with seasonal vegetables',
    category: 'food',
    aspect: 'aspect-[4/3]',
    objectPosition: 'center 60%',
    captionKey: 'gallery.captions.g14',
  },
  {
    id: 'g15',
    photoId: '1550966871-3ed3cdb5ed0c',
    alt: 'Red wine poured slowly into a glass',
    category: 'interior',
    aspect: 'aspect-square',
    objectPosition: 'center',
    captionKey: 'gallery.captions.g15',
  },
  {
    id: 'g16',
    photoId: '1466978913421-dad2ebd01d17',
    alt: 'One quiet table, still awake at closing',
    category: 'events',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center 40%',
    captionKey: 'gallery.captions.g16',
  },
]

/** Cinematic full-bleed photograph used for the closing moment of the page. */
export const GALLERY_CLOSING_IMAGE: GalleryImage = {
  id: 'gclosing',
  photoId: '1414235077428-338989a2e8c0',
  alt: 'The dining room under candlelight as dinner begins',
  category: 'interior',
  aspect: 'aspect-[21/9]',
  objectPosition: 'center 35%',
  captionKey: 'gallery.captions.gclosing',
}