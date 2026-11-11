import * as Bi from "react-icons/bi";
import * as Fc from "react-icons/fc";

export default function RenderIcon({ icon, props = {} }) {
  const name = typeof icon === "string" ? icon : icon?.name;
  if (!name) {
    return <Bi.BiCategory className={props.className || "text-xl text-sec-96"} />;
  }

  const IconSet = name.startsWith("Fc") ? Fc : Bi;
  const Icon = IconSet[name] || Bi.BiCategory;
  return <Icon className={props.className || "text-xl"} />;
}
