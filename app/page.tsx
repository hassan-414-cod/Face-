"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { DriverDashboard } from "@/components/driver-dashboard";
import { Car, LogOut } from "lucide-react";

export default function Home() {
  const handleGlobalLogout = () => {
    localStorage.removeItem("customerEmail");
    localStorage.removeItem("driverProfile");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Tabs defaultValue="customer" className="w-full flex-1 flex flex-col">
        <header className="bg-blue-600 text-white shadow-md border-b border-blue-700 px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Car className="w-7 h-7 text-white" />
              <h1 className="text-xl font-bold tracking-tight">RideScan</h1>
            </div>
            <TabsList className="bg-blue-700/50 border-blue-500/50 h-9 hidden sm:flex">
              <TabsTrigger value="customer" className="data-[state=active]:bg-blue-500 text-white px-4 text-sm transition-colors">Customer Portal</TabsTrigger>
              <TabsTrigger value="driver" className="data-[state=active]:bg-blue-500 text-white px-4 text-sm transition-colors">Driver Portal</TabsTrigger>
            </TabsList>
          </div>

          <button 
            onClick={handleGlobalLogout}
            className="flex items-center gap-2 text-sm font-medium text-blue-100 hover:text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        <div className="sm:hidden bg-blue-600 px-4 pb-3 flex justify-center border-b border-blue-700">
          <TabsList className="bg-blue-700/50 border-blue-500/50 h-9">
            <TabsTrigger value="customer" className="data-[state=active]:bg-blue-500 text-white px-4 text-sm transition-colors">Customer Portal</TabsTrigger>
            <TabsTrigger value="driver" className="data-[state=active]:bg-blue-500 text-white px-4 text-sm transition-colors">Driver Portal</TabsTrigger>
          </TabsList>
        </div>

        <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 w-full">
          <TabsContent value="customer" className="mt-0">
             <CustomerDashboard />
          </TabsContent>
          
          <TabsContent value="driver" className="mt-0">
             <DriverDashboard />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
