import { cFormat } from "@/app/utils/currencyFormat";
import {
  BiCar,
  BiChevronDown,
  BiRupee,
  BiShoppingBag,
  BiVideo,
} from "react-icons/bi";

export default function BudgetWidget() {
  const data = [

  ];

  return (
    <div className="grow flex flex-col gap-2 bg-white p-6 rounded-lg h-full ">
      <div className="flex justify-between items-center">
        <span className="text-lg text-card-title">Budgets</span>
        <button className="flex gap-2 items-center text-sec-96 bg-app-bg p-4 py-2 rounded-lg text-sm">
          This Month <BiChevronDown />
        </button>
      </div>
      <div className="px-2 overflow-auto w-full no-scrollbar ">
        {data.map((item) => {
          const spentPercent = Math.floor((item.spent / item.total) * 100);
          return (
            <div
              key={item.id}
              className="budget-card-item flex flex-col gap-4 py-6 border-b border-b-zinc-100 w-full last-of-type:border-b-0"
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-2 items-center">
                  <item.icon className="text-gray-5a" />
                  <span className="text-lg">{item.name}</span>
                </div>
                <div className="flex items-center">
                  <BiRupee size={16} className="text-gray-5a" />
                  <span className="text-xl">{cFormat(item.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="progress-line w-full h-[4px] rounded-full bg-accent/10">
                  <div
                    style={{ width: spentPercent + "%" }}
                    className={` h-full bg-accent rounded-full`}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-baseline">
                    <span className="text-base text-accent-mild">
                      {cFormat(item.spent)}
                    </span>
                    <span className="font-light text-sm ">Spent</span>
                  </div>
                  <div className="flex gap-2 items-baseline">
                    <span className="text-base text-accent-mild">
                      {cFormat(item.available)}
                    </span>
                    <span className="font-light text-sm">Available</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
