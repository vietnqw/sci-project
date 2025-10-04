import React, { useState, useEffect } from 'react';

interface CountdownClockProps {
  deadline: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownClock: React.FC<CountdownClockProps> = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  if (isExpired) {
    return (
      <div className="rounded-xl shadow-lg p-6 bg-red-50 border border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-2">Registration Closed</h3>
        <p className="text-red-700">The registration deadline has passed.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Registration Deadline</h3>
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{timeLeft.days}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Days</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{timeLeft.hours}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Hours</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{timeLeft.minutes}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Minutes</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{timeLeft.seconds}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownClock;
