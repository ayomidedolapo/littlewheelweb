export default function About() {
  return (
    <div id="about" className="h-auto bg-black text-white">
      <div className="bg-vector h-full flex flex-col items-center px-6 sm:px-10 md:px-20 lg:px-40 py-10 md:py-20">
        <div className="flex flex-col lg:flex-row justify-between space-y-10 lg:space-y-0 lg:space-x-10">
          <div className="lg:w-1/2 space-y-12">
            <div className="space-y-4">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                Reshaping Finance for Everyone
              </p>
              <p className="text-sm md:text-base leading-relaxed">
                Our platform breaks down traditional barriers to financial
                services, providing intuitive tools and resources that work for
                everyone. By combining cutting-edge technology with
                human-centered design, we’ve created a financial ecosystem that
                understands and adapts to diverse needs.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="mr-2">
                    <img alt="" src="uploads/checkmark.svg" />
                  </span>
                  Community Driven
                </li>
                <li className="flex items-center">
                  <span className="mr-2">
                    <img alt="" src="uploads/checkmark.svg" />
                  </span>
                  Transparency
                </li>
                <li className="flex items-center">
                  <span className="mr-2">
                    <img alt="" src="uploads/checkmark.svg" />
                  </span>
                  Security and Secured
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-end">
              <img alt="" src="uploads/arrow-right.svg" />
              <div className="w-[60%] md:w-[40%] aspect-video p-1 bg-white rounded-xl transform rotate-[18deg] overflow-hidden">
                <img
                  alt=""
                  src="/uploads/keke.jpeg"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="lg:w-[45%] space-y-10 md:space-y-20">
            <div className="relative flex flex-col items-start">
              <img alt="" src="uploads/arrow-left.svg" />
              <div className="w-[70%] md:w-full p-1 bg-white rounded-xl z-10">
                <img alt="" src="/uploads/man.svg" className="rounded-xl" />
              </div>
            </div>

            <p className="text-sm md:text-base leading-relaxed px-4 md:px-8">
              Our platform breaks down traditional barriers to financial
              services, providing intuitive tools and resources that work for
              everyone. By combining cutting-edge technology with human-centered
              design, we’ve created a financial ecosystem that understands and
              adapts to diverse needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
