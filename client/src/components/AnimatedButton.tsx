/**
 * Animated Button Component
 * Wraps shadcn/ui Button with Framer Motion scale animation
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/animations";
import { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

export function AnimatedButton({ children, ...props }: ButtonProps) {
  return (
    <motion.div
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      style={{ display: "inline-block" }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}
