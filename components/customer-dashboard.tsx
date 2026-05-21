import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestRide, getRides, RideRequest, getDriverLocation } from "@/lib/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, Car, CheckCircle2, Clock, LocateFixed } from "lucide-react";
import { RideMap } from "@/components/ride-map";

export function CustomerDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  
  const [myRides, setMyRides] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);

  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Check login state
    setTimeout(() => {
      const savedEmail = localStorage.getItem("customerEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setIsLoggedIn(true);
      }
    }, 0);
  }, []);

  // Polling for updates
  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Get live location of customer
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomerLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.warn("Customer location error:", error);
          // Set a fallback location if geolocation fails, such as the Mountain View default
          setCustomerLocation({ lat: 37.42, lng: -122.08 });
        },
        { enableHighAccuracy: true }
      );
    }
    
    const fetchRides = () => {
      const allRides = getRides();
      const customerRides = allRides.filter(r => r.customerId === email);
      
      // Sort by newest
      customerRides.sort((a, b) => b.createdAt - a.createdAt);
      setMyRides(customerRides);
      
      // Check if there's an active one (Pending or Accepted)
      const current = customerRides.find(r => r.status === "Pending" || r.status === "Accepted");
      setActiveRide(current || null);
      
      if (current && current.driverId) {
         setDriverLocation(getDriverLocation(current.driverId));
      } else {
         setDriverLocation(null);
      }
    };

    fetchRides();
    const interval = setInterval(fetchRides, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn, email]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem("customerEmail", email);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customerEmail");
    setIsLoggedIn(false);
    setEmail("");
    setActiveRide(null);
    setMyRides([]);
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !vehicleType) return;
    
    // Simple mock fake fare calculation
    const fare = vehicleType === 'Sedan' ? 12.50 : vehicleType === 'SUV' ? 18.00 : 15.00;

    requestRide({
      customerId: email,
      customerName: email.split("@")[0],
      pickup,
      dropoff,
      vehicleType,
      estimatedFare: fare
    });
    
    setPickup("");
    setDropoff("");
    setVehicleType("");
  };

  if (!isLoggedIn) {
    return (
      <Card className="max-w-md mx-auto mt-10 shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Customer Login</CardTitle>
          <CardDescription>Enter your email to access RideScan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome, {email.split("@")[0]}</h2>
        <p className="text-slate-500 text-sm">Where are you heading today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle>Live Map</CardTitle>
              <Button variant="outline" size="sm" onClick={() => {
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setCustomerLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                    },
                    (error) => console.warn("Customer location error:", error),
                    { enableHighAccuracy: true }
                  );
                }
              }}>
                <LocateFixed className="w-4 h-4 mr-2" /> Locate Me
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full rounded-md overflow-hidden bg-slate-100 relative">
                <RideMap customerLocation={customerLocation} driverLocation={driverLocation} />
              </div>
            </CardContent>
          </Card>

          {!activeRide ? (
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Book a Taxi</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBook} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="pickup" 
                        required 
                        className="pl-9 pr-10" 
                        placeholder="Current Location"
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (customerLocation) setPickup(`${customerLocation.lat.toFixed(5)}, ${customerLocation.lng.toFixed(5)}`);
                        }}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Use Current Location"
                      >
                        <LocateFixed className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dropoff">Dropoff Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-rose-400" />
                      <Input 
                        id="dropoff" 
                        required 
                        className="pl-9" 
                        placeholder="Destination"
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'Sedan', icon: Car, price: '~$12', time: '4 min' },
                        { id: 'Hatchback', icon: Car, price: '~$15', time: '6 min' },
                        { id: 'SUV', icon: Car, price: '~$18', time: '8 min' }
                      ].map(v => (
                         <div 
                           key={v.id}
                           onClick={() => setVehicleType(v.id)}
                           className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-1 transition-all ${vehicleType === v.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}
                         >
                           <v.icon className={`w-6 h-6 ${vehicleType === v.id ? 'text-blue-600' : 'text-slate-500'}`} />
                           <span className={`text-xs font-medium ${vehicleType === v.id ? 'text-blue-700' : 'text-slate-600'}`}>{v.id}</span>
                           <span className="text-[10px] text-slate-400">{v.price}</span>
                         </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    {vehicleType && dropoff && pickup && (
                       <div className="flex justify-between items-center mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-sm font-medium text-slate-600">Estimated Fare</span>
                          <span className="text-lg font-bold text-slate-900">${vehicleType === 'Sedan' ? '12.50' : vehicleType === 'SUV' ? '18.00' : '15.00'}</span>
                       </div>
                    )}
                    <Button type="submit" disabled={!vehicleType} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] duration-200 relative overflow-hidden group">
                      <span className="relative z-10">Request {vehicleType || "Ride"}</span>
                      {vehicleType && <div className="absolute inset-0 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-0 opacity-20"></div>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-blue-100 bg-white overflow-hidden relative">
              {activeRide.status === "Pending" && (
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100">
                  <div className="h-full bg-blue-500 w-1/3 animate-[slide_2s_ease-in-out_infinite]"></div>
                </div>
              )}
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    Ride Status
                  </CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${activeRide.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {activeRide.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                {/* Stepper */}
                <div className="flex justify-between items-center relative px-2">
                   <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0"></div>
                   
                   <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">✓</div>
                      <span className="text-[10px] font-medium text-slate-500">Requested</span>
                   </div>
                   
                   <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeRide.status === 'Pending' ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                        {activeRide.status === 'Pending' ? '2' : '✓'}
                      </div>
                      <span className="text-[10px] font-medium text-slate-700">Searching</span>
                   </div>
                   
                   <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeRide.status === 'Accepted' ? 'bg-emerald-500 text-white border-2 border-emerald-200' : 'bg-slate-200 text-slate-500'}`}>3</div>
                      <span className="text-[10px] font-medium text-slate-500">Accepted</span>
                   </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                  {activeRide.status === "Pending" ? (
                    <div className="relative w-12 h-12 flex items-center justify-center">
                       <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                       <Car className="w-6 h-6 text-blue-600 relative z-10" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900">
                       {activeRide.status === "Pending" ? "Matching with nearby drivers" : "Driver is approaching"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {activeRide.status === "Pending" ? "This usually takes about 2 minutes." : "Your driver is on the way."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pl-2">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1"></div>
                       <div className="w-0.5 h-6 bg-slate-200 my-1"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    </div>
                    <div className="flex flex-col gap-3 flex-1 text-sm">
                       <div>
                         <p className="text-slate-500 text-xs">Pickup</p>
                         <p className="font-medium text-slate-800">{activeRide.pickup}</p>
                       </div>
                       <div>
                         <p className="text-slate-500 text-xs">Dropoff</p>
                         <p className="font-medium text-slate-800">{activeRide.dropoff}</p>
                       </div>
                    </div>
                  </div>
                </div>

                {activeRide.status === "Accepted" && (
                  <div className="mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-xl shadow-sm animate-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 bg-white border border-emerald-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRide.driverName}&backgroundColor=e2e8f0`} alt="Avatar" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <div>
                               <h4 className="font-bold text-slate-900">{activeRide.driverName}</h4>
                               <div className="flex items-center text-xs text-slate-600 mt-0.5">
                                 <span className="text-amber-500 mr-1">★</span> 4.9 • 1,204 rides
                               </div>
                             </div>
                             <div className="text-right">
                               <div className="bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded text-xs font-bold shadow-sm">
                                  3 MIN
                               </div>
                               <div className="text-[10px] text-slate-500 mt-1">ETA</div>
                             </div>
                          </div>
                          
                          <div className="mt-3 bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                             <div className="truncate pr-2">
                               <p className="text-xs text-slate-500">Vehicle</p>
                               <p className="text-sm font-semibold text-slate-800">{activeRide.vehicleName || "Toyota Camry"}</p>
                             </div>
                             <div className="text-right pl-2 border-l border-emerald-50">
                               <p className="text-xs text-slate-500">Plate</p>
                               <p className="text-sm font-bold text-slate-800 tracking-wider">XYZ-1234</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                   <Button variant="ghost" className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50">Cancel Ride Request</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Ride History</CardTitle>
            </CardHeader>
            <CardContent>
              {myRides.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Car className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">No past rides</p>
                  <p className="text-xs text-slate-400 mt-1">Your ride history will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-4 divide-y divide-slate-100">
                  {myRides.map(ride => (
                    <li key={ride.id} className="pt-4 first:pt-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-4">
                           <div className="flex items-center gap-2 mb-1">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                             <span className="font-medium text-sm text-slate-800 truncate">{ride.pickup}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                             <span className="font-medium text-sm text-slate-800 truncate">{ride.dropoff}</span>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold uppercase tracking-wider mb-1
                             ${ride.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                               ride.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 
                               'bg-slate-100 text-slate-600'}`
                           }>
                             {ride.status}
                           </span>
                           <p className="text-sm font-bold text-slate-900">${ride.estimatedFare?.toFixed(2) || '15.00'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                        <span>{new Date(ride.createdAt).toLocaleDateString()} at {new Date(ride.createdAt).toLocaleTimeString()}</span>
                        {ride.vehicleType && <span className="bg-slate-50 px-2 py-1 rounded text-slate-600 border border-slate-100">{ride.vehicleType}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
