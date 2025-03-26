import { PiCalendarBlank } from "react-icons/pi";
export default function Vault3() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[32%] aspect-video bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-2">
      <p>
        <strong>Commit to an Alum</strong>
      </p>
      <p className="text-xs md:text-sm leading-relaxed">
        Alum lets you access a variety of services from different organizations
        through smart instalment plans.
      </p>
      <div className="flex gap-4 p-2 rounded-lg border border-[#F0F2F5] shadow-sm">
        <img
          alt=""
          src="/uploads/donation-image.jpeg"
          className="rounded-md md:w-[30%] w-16 aspect-square object-cover"
        />
        <div className="space-y-1 ">
          <div className="w-1/2 rounded-lg p-3 bg-[#E3EFFC] flex items-center gap-2">
            <img src="/uploads/charity.svg" alt="" width={20} height={20} />
            <span className="text-xs">Charity</span>
          </div>
          <h2 className="text-sm font-semibold">
            Donation for Booking Campaign
          </h2>
          <p className="text-xs text-gray-500">
            ₦21,200 funds raised from ₦100,000
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: "21.2%" }}
            ></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {[
                "/uploads/avatar1.png",
                "/uploads/avatar2.png",
                "/uploads/avatar3.png",
              ].map((profileImage, index) => (
                <img
                  key={index}
                  src={profileImage}
                  alt={`Donor ${index + 1}`}
                  className={`md:w-8 md:h-8 w-6 h-6 rounded-full -ml-2 ${
                    index === 0 ? "ml-0" : ""
                  }`}
                />
              ))}
              <span className="text-[8px] md:w-8 md:h-8 w-6 h-6 rounded-full bg-[#ffece5] flex items-center justify-center -ml-2">
                +10
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] md:text-xs">
              <PiCalendarBlank size={22} />
              <p className="">200 days left</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
