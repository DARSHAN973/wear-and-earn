"use client";
import React, { useEffect, useState } from "react";
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/autoplay"; // Import the autoplay CSS

import "@/components/ui/styles.css";

// Import required Swiper modules correctly
import { Pagination, Navigation } from "swiper/modules";
import { Autoplay } from "swiper/modules"; // Import autoplay from 'swiper/modules'
import Image from "next/image";
import axios from "axios";

//I USED SWIPER.JS FOR SLIDER WHICH IS THIRD PARTY LIBRARY
export default function LandingPageSlider() {
  // STATE FOR ALL BANNER DETAILS FROM GET API
  const [allBannersData, setAllBannersData] = useState([]);
  // dynamic height to perfectly fit screen beneath sticky header on desktop
  const [bannerHeight, setBannerHeight] = useState(null);

  // FETCHING ALL BANNER DETAILS FROM DB
  const fetchAllBanners = async () => {
    try {
      const response = await axios.get("/api/admin/banners");
      const allBanners = response.data.data?.filter((banner) => banner.isActive !== false);
      setAllBannersData(allBanners);
    } catch (error) {
      console.log("Internal Error While Fetching the Banners");
    }
  };

  // FOR API CALL
  useEffect(() => {
    fetchAllBanners();
  }, []);

  // Mobile-optimized banner height for rectangle images
  useEffect(() => {
    const computeHeight = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // Mobile: Much smaller height for rectangle images, Desktop: Full height
      let height;
      if (vw < 480) {
        height = vh * 0.35; // Very small on mobile
      } else if (vw < 768) {
        height = vh * 0.45; // Small on tablet
      } else {
        height = vh; // Full height on desktop
      }
      setBannerHeight(height);
    };
    computeHeight();
    window.addEventListener("resize", computeHeight);
    return () => window.removeEventListener("resize", computeHeight);
  }, []);

  return (
    <section className="w-full h-[35vh] xs:h-[40vh] sm:h-[45vh] md:h-screen relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Swiper
        slidesPerView={1}
        spaceBetween={0}
        loop={true}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet custom-bullet',
          bulletActiveClass: 'swiper-pagination-bullet-active custom-bullet-active'
        }}
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }}
        autoplay={{
          delay: 5000, // 5 seconds for better user experience
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        modules={[Pagination, Navigation, Autoplay]}
        className="mySwiper banner-swiper h-full w-full group"
      >
        {/* RENDERING THE BANNERS DETAILS HERE */}
        {allBannersData?.map((banner , index) => {

          const {id , isActive, imageUrl ,title} = banner

          return (
            <SwiperSlide key={id} className={isActive ? "fade-in-slide" : "hidden"} >
              <div className="relative w-full h-[35vh] xs:h-[40vh] sm:h-[45vh] md:h-screen overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={title || "banner"}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 100vw, 100vw"
                  className="select-none object-contain sm:object-cover object-center bg-gray-100 dark:bg-gray-800 transition-transform duration-700 hover:scale-105"
                />
                
                {/* Enhanced gradient overlays */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-20 md:h-32 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Enhanced content overlay */}
                <div className="absolute inset-0 flex items-end justify-center pb-6 sm:pb-8 md:items-center md:pb-0">
                  <div className="text-center text-white px-4 sm:px-6 md:px-8 max-w-5xl mx-auto">
                    {title && title.trim() && title !== "2nd" && (
                      <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-2xl leading-tight animate-fade-up">
                          {title}
                        </h1>
                        <div className="w-16 sm:w-20 md:w-24 h-1 bg-white/80 mx-auto rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 opacity-20">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-2 border-white/50 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 opacity-20">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-2 border-white/30 rounded-full animate-pulse delay-500"></div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
