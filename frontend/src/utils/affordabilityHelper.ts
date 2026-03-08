export interface RentalProperty {
  id: string;
  city: string;
  title: string;
  price: number;
}

export const MOCK_PROPERTIES: RentalProperty[] = [
  { id: '1', city: 'Toronto', title: '1 Bed Condo Downtown', price: 2500 },
  { id: '2', city: 'Toronto', title: 'Studio Apartment', price: 2000 },
  { id: '3', city: 'Ottawa', title: '2 Bed Apartment', price: 2200 },
  { id: '4', city: 'Ottawa', title: '1 Bed Basement', price: 1500 },
  { id: '5', city: 'Waterloo', title: '1 Bed Apartment', price: 1800 },
  { id: '6', city: 'Hamilton', title: '2 Bed Townhouse', price: 2300 },
  { id: '7', city: 'London', title: '1 Bed Apartment', price: 1400 },
];

export const checkAffordability = (price: number, budget: number): 'Affordable' | 'Stretch' | 'Out of Budget' => {
  if (price <= budget) {
    return 'Affordable';
  } else if (price <= budget * 1.2) {
    return 'Stretch'; // Up to 20% over budget is a stretch
  } else {
    return 'Out of Budget';
  }
};
