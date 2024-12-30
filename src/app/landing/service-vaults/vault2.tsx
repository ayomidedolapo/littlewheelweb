export default function Vault2() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[32%] aspect-video bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-2">
      <p>
        <strong>Create Group Vault</strong>
      </p>
      <p className="text-xs md:text-sm leading-relaxed">
        Group savings allows you to invite your buddies to save together towards
        a common goal in a single account.
      </p>
      <div className="relative h-40 flex items-center justify-center gap-20">
        <img
          alt=""
          src="/uploads/buddies1.jpeg"
          className="rounded-md w-[25%] aspect-square object-cover -rotate-12 "
        />
        <img
          alt=""
          src="/uploads/buddies2.jpeg"
          className="rounded-md w-[25%] aspect-square object-cover z-10 absolute top-3"
        />
        <img
          alt=""
          src="/uploads/buddies3.jpeg"
          className="rounded-md w-[25%] aspect-square object-cover rotate-12 "
        />
      </div>
    </div>
  );
}
