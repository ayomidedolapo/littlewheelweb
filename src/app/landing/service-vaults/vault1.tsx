import { ScrollArea } from "@littlewheel-landing/components/ui/scroll-area";

const groupVaultItems = [
  {
    id: 1,
    title: "New Shoe for Christmas",
    description: "₦21,200 funds raised from ₦100,000",
    imageSrc: "/uploads/personal.svg",
    progress: "15%",
  },
  {
    id: 2,
    title: "Vacation Trip",
    description: "₦50,000 funds raised from ₦200,000",
    imageSrc: "/uploads/personal.svg",
    progress: "25%",
  },
  {
    id: 3,
    title: "Wedding Gift",
    description: "₦70,000 funds raised from ₦150,000",
    imageSrc: "/uploads/personal.svg",
    progress: "47%",
  },
];

export default function Vault1() {
  return (
    <div className="w-[90%] sm:w-[45%] lg:w-[32%] aspect-video bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-2">
      <p>
        <strong>Start a Personal Vault</strong>
      </p>
      <p className="text-xs md:text-sm leading-relaxed">
        Save first, flex later. Start small, stack the cash and wheel towards
        your financial goals.
      </p>

      <ScrollArea className="h-40 px-4">
        <div className="space-y-4">
          {groupVaultItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-2 rounded-lg border border-[#F0F2F5] shadow-sm"
            >
              <img
                src={item.imageSrc}
                className="rounded-md w-[15%] object-cover"
                alt={item.title}
              />
              <div className="space-y-1 flex-1">
                <h2 className="text-sm font-semibold">{item.title}</h2>
                <p className="text-xs text-gray-500">{item.description}</p>
                <div className="flex items-center gap-2">
                  <div className="w-full h-2 bg-gray-200 rounded-full relative">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: item.progress }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{item.progress}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
