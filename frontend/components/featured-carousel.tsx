'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { competitionsAPI, Competition } from '../app/api/competitions';

const truncateWords = (text: string, maxWords: number): string => {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const ArrowButton = ({
  direction,
  onClick,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
}) => {
  const isLeft = direction === 'left';
  return (
    <button
      type="button"
      aria-label={isLeft ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 ${
        isLeft ? 'left-2 sm:left-3' : 'right-2 sm:right-3'
      } z-20 rounded-full bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 button-smooth shadow-lg backdrop-blur-sm`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 sm:w-6 sm:h-6"
      >
        {isLeft ? (
          <path fillRule="evenodd" d="M15.78 4.72a.75.75 0 010 1.06L9.56 12l6.22 6.22a.75.75 0 11-1.06 1.06l-6.75-6.75a.75.75 0 010-1.06l6.75-6.75a.75.75 0 011.06 0z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M8.22 19.28a.75.75 0 010-1.06L14.44 12 8.22 5.78a.75.75 0 111.06-1.06l6.75 6.75a.75.75 0 010 1.06l-6.75 6.75a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        )}
      </svg>
    </button>
  );
};

const ProgressIndicator = ({
  isActive,
  duration,
  animationKey,
  isDot = false,
}: {
  isActive: boolean;
  duration: number;
  animationKey: number;
  isDot?: boolean;
}) => {
  if (isDot) {
    return (
      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
        isActive ? 'bg-white' : 'bg-white/30'
      }`} />
    );
  }

  return (
    <div className="h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-enhanced">
      <div
        key={animationKey}
        className={`h-full bg-white rounded-full transition-all duration-500 ease-out progress-glow ${
          isActive ? 'animate-progress' : 'w-0'
        }`}
        style={{
          animationDuration: `${duration}ms`,
          animationFillMode: 'forwards',
          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
};

export default function FeaturedCarousel() {
  const [items, setItems] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [animationKey, setAnimationKey] = useState<number>(Date.now());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slideDuration = 5000; // 5 seconds per slide

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await competitionsAPI.getFeaturedCompetitions({ limit: 10 });
        if (!isMounted) return;
        setItems(response.competitions || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load featured competitions');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const visible = useMemo(() => items.filter(c => c.is_featured), [items]);

  const goToSlide = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= visible.length) return;

    setCurrentIndex(index);
    setAnimationKey(Date.now());
    const scrollAmount = container.clientWidth * index;
    container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
  }, [visible.length]);

  const nextSlide = useCallback(() => {
    const nextIndex = (currentIndex + 1) % visible.length;
    goToSlide(nextIndex);
  }, [currentIndex, visible.length, goToSlide]);

  const prevSlide = useCallback(() => {
    const prevIndex = currentIndex === 0 ? visible.length - 1 : currentIndex - 1;
    goToSlide(prevIndex);
  }, [currentIndex, visible.length, goToSlide]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      prevSlide();
    } else {
      nextSlide();
    }
  };

  useEffect(() => {
    if (!isAutoPlaying || visible.length <= 1) return;
    const startAutoPlay = () => {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, slideDuration);
    };
    startAutoPlay();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, visible.length, nextSlide, slideDuration]);

  useEffect(() => {}, [currentIndex]);

  const handleMouseEnter = useCallback(() => {
    setIsAutoPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTimeout(() => {
      setIsAutoPlaying(true);
    }, 1000);
  }, []);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const newIndex = Math.round(scrollLeft / containerWidth);
      setCurrentIndex(newIndex);
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full rounded-2xl bg-gray-100 animate-pulse" aria-label="Loading featured competitions" />
      </section>
    );
  }

  if (error || visible.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="relative">
        <div
          ref={containerRef}
          role="region"
          aria-label="Featured competitions carousel"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') handleScroll('left');
            if (e.key === 'ArrowRight') handleScroll('right');
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="flex overflow-x-hidden snap-x snap-mandatory carousel-smooth rounded-2xl"
        >
          {visible.map((comp, index) => (
            <Link
              key={comp.id}
              href={`/competitions/${comp.id}`}
              onClick={handleCardClick}
              className={`relative min-w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80 snap-start rounded-2xl overflow-hidden carousel-card-clickable block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                index === currentIndex ? 'fade-in' : ''
              }`}
            >
              {comp.background_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comp.background_image_url}
                  alt={comp.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out"
                  style={{
                    transform: index === currentIndex ? 'scale(1.05)' : 'scale(1)',
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

              <div className="absolute inset-0 p-4 sm:p-6 lg:p-8 flex items-end">
                <div className="w-full max-w-3xl">
                  <div className="text-smooth">
                    <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 line-clamp-2 text-smooth">
                      {comp.title}
                    </h3>
                    {comp.description && (
                      <p className="text-white/90 text-xs sm:text-sm md:text-base lg:text-lg line-clamp-2 sm:line-clamp-3 text-smooth">
                        {truncateWords(comp.description, 25)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Arrow buttons - only show on larger screens */}
        <div className="hidden md:block">
          <ArrowButton direction="left" onClick={() => handleScroll('left')} />
          <ArrowButton direction="right" onClick={() => handleScroll('right')} />
        </div>

        {/* Page Indicators - responsive sizing */}
        {visible.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2 lg:space-x-3 max-w-[80%] sm:max-w-[70%] md:max-w-none">
              {visible.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => goToSlide(index)}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded transition-all duration-300 hover:scale-110 flex-shrink-0"
                >
                  {/* Mobile: Dots */}
                  <div className="block md:hidden">
                    <ProgressIndicator
                      key={`${index}-${currentIndex}-dot`}
                      isActive={index === currentIndex}
                      duration={slideDuration}
                      animationKey={animationKey}
                      isDot={true}
                    />
                  </div>

                  {/* Tablet: Small bars */}
                  <div className="hidden md:block lg:hidden w-6">
                    <ProgressIndicator
                      key={`${index}-${currentIndex}-small`}
                      isActive={index === currentIndex}
                      duration={slideDuration}
                      animationKey={animationKey}
                    />
                  </div>

                  {/* Desktop: Medium bars */}
                  <div className="hidden lg:block xl:hidden w-12">
                    <ProgressIndicator
                      key={`${index}-${currentIndex}-medium`}
                      isActive={index === currentIndex}
                      duration={slideDuration}
                      animationKey={animationKey}
                    />
                  </div>

                  {/* Large Desktop: Wider bars */}
                  <div className="hidden xl:block w-16">
                    <ProgressIndicator
                      key={`${index}-${currentIndex}-wide`}
                      isActive={index === currentIndex}
                      duration={slideDuration}
                      animationKey={animationKey}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
