import { motion } from "framer-motion";

interface MicrophoneIconProps {
  isRecording: boolean;
}

export default function MicrophoneIcon({ isRecording }: MicrophoneIconProps) {
  return (
    <motion.svg
      width="400"
      height="400"
      viewBox="0 0 100 100"
      initial="idle"
      animate={isRecording ? "recording" : "idle"}
      className="w-[400px] h-[400px]"
    >
      {/* Base stand */}
      <motion.path
        d="M40 75 L60 75 L60 85 L40 85 Z"
        fill="hsl(var(--primary))"
        variants={{
          idle: { opacity: 0.7 },
          recording: { opacity: 1 }
        }}
      />
      
      {/* Main microphone body */}
      <motion.path
        d="M35 30 C35 19 41.5 10 50 10 C58.5 10 65 19 65 30 L65 55 C65 66 58.5 75 50 75 C41.5 75 35 66 35 55 L35 30"
        fill="hsl(var(--primary))"
        variants={{
          idle: {
            scale: 1,
            opacity: 0.9,
          },
          recording: {
            scale: [1, 1.02, 1],
            opacity: 1,
            transition: {
              repeat: Infinity,
              duration: 1.5,
            },
          },
        }}
      />

      {/* Recording ripple effects */}
      {isRecording && [30, 45, 60].map((radius, i) => (
        <motion.circle
          key={radius}
          cx="50"
          cy="45"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.15, 0],
            scale: [0.8, 1.2, 1.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            delay: i * 0.4,
          }}
        />
      ))}
    </motion.svg>
  );
}
