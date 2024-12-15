import { motion } from "framer-motion";

interface MicrophoneIconProps {
  isRecording: boolean;
}

export default function MicrophoneIcon({ isRecording }: MicrophoneIconProps) {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      initial="idle"
      animate={isRecording ? "recording" : "idle"}
      className="w-24 h-24"
    >
      {/* Base */}
      <motion.path
        d="M50 70 L50 85"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        variants={{
          idle: { opacity: 0.5 },
          recording: { opacity: 1 }
        }}
      />
      <motion.path
        d="M35 85 L65 85"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        variants={{
          idle: { opacity: 0.5 },
          recording: { opacity: 1 }
        }}
      />
      
      {/* Microphone body */}
      <motion.path
        d="M35 30 C35 19 41.5 10 50 10 C58.5 10 65 19 65 30 L65 45 C65 56 58.5 65 50 65 C41.5 65 35 56 35 45 L35 30"
        fill="hsl(var(--primary))"
        variants={{
          idle: {
            scale: 1,
            opacity: 0.9,
          },
          recording: {
            scale: [1, 1.05, 1],
            opacity: 1,
            transition: {
              repeat: Infinity,
              duration: 1,
            },
          },
        }}
      />

      {/* Recording rings */}
      {[20, 30, 40].map((radius, i) => (
        <motion.circle
          key={radius}
          cx="50"
          cy="40"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          variants={{
            idle: { opacity: 0, scale: 1 },
            recording: {
              opacity: [0, 0.2, 0],
              scale: [0.8, 1.2, 1.5],
              transition: {
                repeat: Infinity,
                duration: 2,
                delay: i * 0.4,
              },
            },
          }}
        />
      ))}
    </motion.svg>
  );
}
