import { useEffect, useState } from "react";

export const useTimer = (autoStart = false) => {
  const [running, setRunning] = useState(autoStart);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (running) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 10);
    } else {
      setTime(0);
    }
    return () => clearInterval(interval);
  }, [running]);

  return {
    seconds: time / 100,
    time: (
      <span>
        {("0" + Math.floor((time / 6000) % 60)).slice(-2)}:
        {("0" + Math.floor((time / 100) % 60)).slice(-2)}
      </span>
    ),
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: () => setTime(0),
  };
};
