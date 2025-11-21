import * as Bi from "react-icons/bi";
import * as Fc from "react-icons/fc";

export default function RenderIcon({ icon, props }) {
  const getLibrary = (name) => {
    if (name.startsWith("Fc")) return Fc;
    if (name.startsWith("Bi")) return Bi;
    return Bi;
  };

  const { name } = icon;
  const IconSet = getLibrary(name);
  const Icon = IconSet[name];
  return Icon ? <Icon className={props.className && props.className} /> : null;
}
