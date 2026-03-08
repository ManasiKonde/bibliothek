export type Review = {
  id: string;
  user: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Seller = {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalSales: number;
};

export type Book = {
  id: string;
  title: string;
  price: string;
  condition: string;
  images: string[];
  seller: Seller;
  reviews: Review[];
};

export type User = {
  name: string;
  email: string;
};
