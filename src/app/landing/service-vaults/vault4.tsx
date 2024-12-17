export default function Vault4() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[59%] h-[385px] bg-white border border-[#E4E7EC] shadow-sm rounded-lg grid grid-cols-1 md:grid-cols-2 items-center">
      <div className="p-4">
        <p>
          <strong>Create Group Vault</strong>
        </p>
        <p className="text-xs md:text-sm leading-relaxed">
          Group savings allows you to invite your buddies to save together
          towards a common goal in a single account.
        </p>
      </div>
      <div className="h-full flex justify-center">
        <div className="relative overflow-hidden w-[276px] h-[370px]">
          <img
            src="uploads/phone.png"
            alt="Phone"
            className="absolute w-[276px] h-[65%] md:h-full object-cover object-bottom"
          />
        </div>
      </div>
    </div>
  );
}
