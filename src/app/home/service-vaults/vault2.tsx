import Image from "next/image";

export default function Vault2() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[32%] aspect-video bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-2">
      <p>
        <strong>Create/Join Group Vaults</strong>
      </p>
      <p className="text-xs md:text-sm leading-relaxed">
        Save together, ball together. Team up with your friends to save for a
        shared goal.
      </p>
      <div className="relative h-40 flex items-center justify-center gap-20">
        <Image
          src="/uploads/buddies1.jpeg"
          alt=""
          width={100}
          height={100}
          className="rounded-md w-[25%] aspect-square object-cover -rotate-12"
          priority
        />
        <Image
          src="/uploads/buddies2.jpeg"
          alt=""
          width={100}
          height={100}
          className="rounded-md w-[25%] aspect-square object-cover z-10 absolute top-3"
        />
        <Image
          src="/uploads/buddies3.jpeg"
          alt=""
          width={100}
          height={100}
          className="rounded-md w-[25%] aspect-square object-cover rotate-12"
          priority
        />
      </div>
    </div>
  );
}
