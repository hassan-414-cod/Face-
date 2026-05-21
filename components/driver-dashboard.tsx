import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getRides, updateRideStatus, saveDriverProfile, getDriverProfile, DriverProfile, RideRequest, saveDriverLocation } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, ScanFace, CheckCircle2, AlertTriangle, Loader2, LocateFixed, Navigation } from "lucide-react";
import Webcam from "react-webcam";
import { RideMap } from "@/components/ride-map";

export function DriverDashboard() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration Form
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [faceImage, setFaceImage] = useState<string | null>(null);

  // Rides state
  const [availableRides, setAvailableRides] = useState<RideRequest[]>([]);
  
  // Scanning state for acceptance
  const [isScanning, setIsScanning] = useState(false);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<{success: boolean, msg: string} | null>(null);
  const [isVerifyingMsg, setIsVerifyingMsg] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    // Check if profile exists (simulation of driver login)
    setTimeout(() => {
      const p = getDriverProfile();
      if (p) {
        setProfile(p);
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!profile) return;
    
    // Live Location Tracking
    let watchId: number;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setDriverLocation(loc);
          saveDriverLocation(profile.id, loc);
        },
        (error) => {
          console.warn("Driver location error:", error);
          const loc = { lat: 37.42, lng: -122.08 }; // fallback
          setDriverLocation(loc);
          saveDriverLocation(profile.id, loc);
        },
        { enableHighAccuracy: true }
      );
    }
    
    const fetchRequests = () => {
      const all = getRides();
      // Show pending rides, and rides accepted by this driver
      const myRides = all.filter(r => 
        r.status === "Pending" || (r.status === "Accepted" && r.driverId === profile.id)
      );
      myRides.sort((a, b) => b.createdAt - a.createdAt);
      setAvailableRides(myRides);
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 2000);
    return () => {
      clearInterval(interval);
      if (watchId !== undefined && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [profile]);

  const captureRegistrationFace = useCallback(() => {
    const slide = webcamRef.current?.getScreenshot();
    if (slide) setFaceImage(slide);
  }, [webcamRef]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !vehicle) return;
    if (!faceImage) {
      alert("Please scan your face to register.");
      return;
    }

    const newProfile: DriverProfile = {
      id: Math.random().toString(36).substring(7),
      name,
      phone,
      vehicleName: vehicle,
      faceEncodingBase64: faceImage // simulating face encoding via the image itself
    };

    saveDriverProfile(newProfile);
    setProfile(newProfile);
    setIsRegistering(false);
  };

  const handleLogout = () => {
    setProfile(null);
    setName("");
    setPhone("");
    setVehicle("");
    setFaceImage(null);
  };

  const initiateAcceptance = (rideId: string) => {
    setVerificationFeedback(null);
    setPendingRideId(rideId);
    setIsScanning(true);
  };

  const attemptAcceptanceWithFace = async () => {
    const currentFace = webcamRef.current?.getScreenshot();
    if (!currentFace || !profile || !pendingRideId) return;

    setIsVerifyingMsg(true);

    try {
      // Send both images to our Gemini route for boolean validation
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: currentFace,
          driverImageBase64: profile.faceEncodingBase64
        })
      });

      const data = await res.json();
      
      if (data.match) {
        // Face matches!
        updateRideStatus(pendingRideId, { 
          status: "Accepted", 
          driverId: profile.id,
          driverName: profile.name,
          vehicleName: profile.vehicleName
        });
        
        setVerificationFeedback({ success: true, msg: "Face verified! Ride accepted." });
        setTimeout(() => {
          setIsScanning(false);
          setPendingRideId(null);
          setVerificationFeedback(null);
        }, 2000);
      } else {
        // Face verification failed
        setVerificationFeedback({ success: false, msg: data.reason || "Face verification failed. Unauthorized driver." });
      }
    } catch(err) {
      setVerificationFeedback({ success: false, msg: "System error during face scan." });
    } finally {
      setIsVerifyingMsg(false);
    }
  };

  if (!profile) {
    if (isLoginMode) {
      return (
        <Card className="max-w-md mx-auto mt-10 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Driver Login</CardTitle>
            <CardDescription className="text-center">Enter your phone and password to access the Driver Portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
               <Label>Phone Number</Label>
               <Input placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
               <Label>Password</Label>
               <Input type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800" onClick={() => {
              const p = getDriverProfile();
              if (p) setProfile(p);
              else alert("No local profile found. Please register.");
            }}>
              Sign In (Simulated)
            </Button>
            <div className="text-center mt-4">
               <button 
                 type="button" 
                 onClick={() => setIsLoginMode(false)}
                 className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors hover:underline"
               >
                 Don't have an account? Sign up
               </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="max-w-xl mx-auto mt-8 shadow-lg border-slate-200">
        <CardHeader>
          <div className="flex justify-between items-center bg-slate-50 p-1 rounded-md mb-4 max-w-[240px] mx-auto border border-slate-200">
             <button onClick={() => setIsLoginMode(true)} className="flex-1 text-sm py-1.5 font-medium rounded text-slate-600 hover:text-slate-900">Login</button>
             <button className="flex-1 text-sm py-1.5 font-medium rounded bg-white text-slate-900 shadow-sm border border-slate-200">Sign Up</button>
          </div>
          <CardTitle className="text-2xl text-center">Driver Registration</CardTitle>
          <CardDescription className="text-center">Sign up and setup your biometric face scan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dname">Full Name</Label>
                <Input id="dname" required value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dphone">Phone Number</Label>
                <Input id="dphone" required value={phone} onChange={e=>setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dvehicle">Vehicle Details (e.g., Toyota Camry XYZ-1234)</Label>
              <Input id="dvehicle" required value={vehicle} onChange={e=>setVehicle(e.target.value)} />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Label className="mb-2 block font-semibold">Face Scan Registration</Label>
              <p className="text-xs text-slate-500 mb-4">Please look directly at the camera to register your biometric identity.</p>
              
              <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-video relative flex flex-col items-center justify-center">
                {faceImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={faceImage} alt="Face Scan" className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                ) : (
                   <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      videoConstraints={{ facingMode: "user" }}
                    />
                    <div className="absolute inset-0 border-[30px] border-slate-900/60 pointer-events-none" style={{ borderRadius: '40% 40% 40% 40%' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[60%] h-[80%] border-4 border-dashed border-blue-400 rounded-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                    </div>
                  </>
                )}
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {!faceImage ? (
                     <Button type="button" onClick={captureRegistrationFace} className="bg-blue-600 hover:bg-blue-700 shadow-lg text-lg px-8 py-6 rounded-full group overflow-hidden relative">
                       <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                       <ScanFace className="w-6 h-6 mr-3" /> Capture Face
                     </Button>
                  ) : (
                     <Button type="button" variant="secondary" onClick={() => setFaceImage(null)} className="shadow-md font-medium px-6 py-5 rounded-full text-base">
                       Retake photo
                     </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsRegistering(false)}>Cancel</Button>
              <Button type="submit" disabled={!faceImage} className="bg-slate-900">Complete Registration</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight">{profile.name} Dashboard</h2>
        <p className="text-slate-500 text-sm">{profile.vehicleName}</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div>
            <CardTitle>Your Live Location</CardTitle>
            <CardDescription>We stream this directly to your assigned customers.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if ("geolocation" in navigator && profile) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                  setDriverLocation(loc);
                  saveDriverLocation(profile.id, loc);
                },
                (error) => console.warn("Driver location error:", error),
                { enableHighAccuracy: true }
              );
            }
          }}>
            <LocateFixed className="w-4 h-4 mr-2" /> Locate Me
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full rounded-md overflow-hidden bg-slate-100 relative">
            <RideMap driverLocation={driverLocation} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h3 className="font-semibold text-lg text-slate-800">Incoming Ride Requests</h3>
        
        {availableRides.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-slate-50">
            <p className="text-slate-500 text-sm">No rides available right now. Waiting for requests...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {availableRides.map(ride => (
              <Card key={ride.id} className={`shadow-md border overflow-hidden ${ride.status === 'Accepted' ? 'border-emerald-300 bg-emerald-50/50' : 'border-blue-200 bg-white'}`}>
                {ride.status === "Pending" && (
                   <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 animate-pulse"><AlertTriangle className="w-4 h-4"/> NEW RIDE REQUEST</span>
                      <span>{ride.estimatedFare ? `$${ride.estimatedFare.toFixed(2)} estimated` : ''}</span>
                   </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-5">
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ride.customerName}&backgroundColor=e2e8f0`} alt="Avatar" className="w-full h-full object-cover" />
                       </div>
                       <div>
                         <span className="font-bold text-lg text-slate-900 block">{ride.customerName}</span>
                         <span className="text-xs font-semibold uppercase text-blue-600 flex items-center gap-1">
                            <span className="text-amber-500 text-sm">★</span> 4.8 Rating
                         </span>
                       </div>
                     </div>
                     <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${ride.status==='Pending'?'bg-amber-100 text-amber-800 border border-amber-200':'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                       {ride.status}
                     </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-slate-300 before:to-rose-400">
                      <div className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                         <div className="w-5 h-5 bg-white border-4 border-emerald-400 rounded-full z-10 shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.3)]"></div>
                         <div className="ml-4 text-sm font-semibold text-slate-800 leading-tight pt-0.5 pr-2">{ride.pickup}</div>
                      </div>
                      <div className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                         <div className="w-5 h-5 bg-white border-4 border-rose-400 rounded-[4px] z-10 shrink-0 shadow-[0_0_10px_rgba(251,113,133,0.3)]"></div>
                         <div className="ml-4 text-sm font-semibold text-slate-800 leading-tight pt-0.5 pr-2">{ride.dropoff}</div>
                      </div>
                    </div>
                  </div>

                  {ride.status === "Pending" ? (
                    <div className="mt-6 flex gap-3">
                      <Button variant="outline" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-12">
                        Reject
                      </Button>
                      <Button onClick={() => initiateAcceptance(ride.id)} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 shadow-md h-12 text-lg animate-in slide-in-from-bottom-2 duration-300">
                        Accept Ride
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center shadow-sm">
                        <span className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5"/> Verified & Assigned to you
                        </span>
                      </div>
                      <Button 
                        onClick={() => {
                          const originStr = driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : '';
                          const destStr = encodeURIComponent(ride.dropoff);
                          const wpStr = encodeURIComponent(ride.pickup);
                          window.open(`https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${wpStr}`, '_blank');
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md h-12 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 duration-300"
                      >
                        <Navigation className="w-5 h-5" /> Navigate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isScanning} onOpenChange={(open) => {
        if (!open && !isVerifyingMsg) setIsScanning(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Face Verification</DialogTitle>
            <DialogDescription>
              To accept this ride, we need to verify your identity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {verificationFeedback && (
              <Alert variant={verificationFeedback.success ? "default" : "destructive"} className={verificationFeedback.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : ""}>
                {verificationFeedback.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{verificationFeedback.success ? "Verified" : "Access Denied"}</AlertTitle>
                <AlertDescription>{verificationFeedback.msg}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center bg-black rounded-lg overflow-hidden aspect-[4/3] relative">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                videoConstraints={{ facingMode: "user" }}
              />
              
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/70 transition-all duration-500" style={{ borderRadius: '50% 50% 50% 50%' }}></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className={`w-[55%] h-[75%] border-[3px] border-dashed rounded-full transition-all duration-300
                   ${isVerifyingMsg ? 'border-amber-400 animate-spin-slow' : 
                     verificationFeedback?.success ? 'border-emerald-500 bg-emerald-500/20' : 
                     verificationFeedback && !verificationFeedback.success ? 'border-rose-500' : 'border-indigo-400'}`}>
                 </div>
              </div>
              
              <div className="absolute top-4 left-0 right-0 flex justify-center">
                 <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider">
                   {isVerifyingMsg ? "HOLD STILL... SCANNING" : "POSITION FACE IN FRAME"}
                 </div>
              </div>

            </div>

            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base" 
              onClick={attemptAcceptanceWithFace}
              disabled={isVerifyingMsg || (verificationFeedback?.success || false)}
            >
              {isVerifyingMsg ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying biometrics...</>
              ) : (
                <><ScanFace className="mr-2 h-5 w-5" /> Tap to Scan & Accept</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
