export default function Vault5() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[38%] aspect-video bg-white border border-[#E4E7EC] shadow-sm rounded-lg px-4 pt-4 space-y-4">
      <div>
        <p>
          <strong>Create Group Vault</strong>
        </p>
        <p className="text-xs md:text-sm leading-relaxed">
          Group savings allows you to invite your buddies to save together
          towards a common goal in a single account.
        </p>
      </div>
      <div className="w-full flex items-center justify-center">
        <div
          className="relative  overflow-hidden rounded-lg"
          style={{
            width: "276px",
            height: "288.5px",
          }}
        >
          <img
            src="uploads/phone.png"
            alt="Phone"
            className="absolute w-[276px] h-[577px] object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
