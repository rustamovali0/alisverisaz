export type StoreLocation = {
  id: string;
  storeId: string;
  storeName?: string;
  name: string;
  city: string;
  district: string | null;
  address: string;
  mapLink: string | null;
  latitude: number | null;
  longitude: number | null;
  nearestMetro: string | null;
  metroDistanceMeters: number | null;
  metroWalkMinutes: number | null;
  busStopName: string | null;
  busRoutes: string[];
  phone: string | null;
  workingHours: string | null;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  showAddress: boolean;
  showMetro: boolean;
  showBus: boolean;
  showMap: boolean;
  isActive: boolean;
  createdAt: string;
};

export type ProductLocationAvailability = {
  id: string;
  productId: string;
  locationId: string;
  stockQuantity: number;
  isAvailable: boolean;
  location: StoreLocation;
};

export type LocationActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
