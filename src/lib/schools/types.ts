export type City = {
  id: string;
  name: string;
};

export type SchoolCityRef = {
  id: string;
  name: string;
};

export type School = {
  id: string;
  name: string;
  city: SchoolCityRef;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type SchoolSelection = {
  cityId: string;
  schoolId: string;
};
