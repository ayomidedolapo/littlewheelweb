import { ReactNode } from "react";
import Image from "next/image";
import { GoBellFill } from "react-icons/go";
import { FaBarsStaggered } from "react-icons/fa6";

type Props = {
  children: ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-black/70 flex items-center justify-center">
      <div className="w-full md:w-[30%] h-screen bg-white">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] h-[10%]">
          <Image
            src="/uploads/logo.svg"
            alt="Little Wheel"
            width={150}
            height={40}
            unoptimized
          />

          <div className="flex items-center gap-4">
            <GoBellFill color="#0F172A" size={24} />

            <div className="bg-[#EFEFEF] rounded-md flex items-center justify-center p-2">
              <FaBarsStaggered size={20} />
            </div>
          </div>
        </header>
        <div className="p-5 h-[90%]">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
