"use client";

// Simple simulated DB using localStorage since Firebase IAM setup failed.
// Polling is used to simulate realtime subscriptions across the Customer/Driver tabs.

export type RideStatus = "Pending" | "Accepted" | "Completed" | "Cancelled";

export interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  pickup: string;
  dropoff: string;
  vehicleType: string;
  status: RideStatus;
  driverId?: string;
  driverName?: string;
  vehicleName?: string;
  estimatedFare?: number;
  createdAt: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  vehicleName: string;
  phone: string;
  faceEncodingBase64: string; // the face image from registration
}

export const getRides = (): RideRequest[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("rides");
  return data ? JSON.parse(data) : [];
};

export const saveRides = (rides: RideRequest[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("rides", JSON.stringify(rides));
};

export const requestRide = (ride: Omit<RideRequest, "id" | "createdAt" | "status">) => {
  const rides = getRides();
  const newRide: RideRequest = {
    ...ride,
    id: Math.random().toString(36).substring(7),
    status: "Pending",
    createdAt: Date.now(),
  };
  saveRides([...rides, newRide]);
  return newRide;
};

export const updateRideStatus = (id: string, updates: Partial<RideRequest>) => {
  const rides = getRides();
  const newRides = rides.map(r => r.id === id ? { ...r, ...updates } : r);
  saveRides(newRides);
};

export const getDriverProfile = (): DriverProfile | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("driverProfile");
  return data ? JSON.parse(data) : null;
};

export const saveDriverProfile = (profile: DriverProfile) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("driverProfile", JSON.stringify(profile));
};

export const getDriverLocation = (driverId: string): { lat: number, lng: number } | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(`driverLocation_${driverId}`);
  return data ? JSON.parse(data) : null;
};

export const saveDriverLocation = (driverId: string, location: { lat: number, lng: number }) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`driverLocation_${driverId}`, JSON.stringify(location));
};
