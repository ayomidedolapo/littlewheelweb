"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@littlewheel/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@littlewheel/components/ui/dropdown-menu";

export default function AgentHeader() {
  return (
    <header className="h-[10%] flex items-center justify-between md:justify-between px-6 py-4 shadow-md">
      <div className="relative w-full md:w-auto flex justify-center md:justify-start">
        <Image
          src="/uploads/logo.svg"
          alt="Little Wheel"
          width={150}
          height={40}
          priority
          className="mx-auto"
        />
      </div>

      <div className="hidden md:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold">
              Download App
              <ChevronDown size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="https://apps.apple.com/" target="_blank">
                iOS (App Store)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="https://play.google.com/store/apps/" target="_blank">
                Android (Google Play)
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
