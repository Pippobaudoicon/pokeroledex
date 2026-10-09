import * as React from "react";
import { FaGenderless, FaMars, FaVenus } from "react-icons/fa";
import { Gender } from "@/api/schemas";

export interface GenderIconProps {
  gender: Gender;
  className?: string;
  onClick?: React.MouseEventHandler<SVGElement>;
}

export const GenderIcon = ({ gender, className, onClick }: GenderIconProps) => {
  const icon = React.useMemo(() => {
    switch (gender) {
      case Gender.M:
        return <FaMars color="#03adfc" size={24} className={className} onClick={onClick} />;
      case Gender.F:
        return <FaVenus color="#f781f1" size={24} className={className} onClick={onClick} />;
      case Gender.N:
        return (
          <FaGenderless color="gray" size={24} className={className} onClick={onClick} />
        );
      default:
        throw new Error("Invalid gender");
    }
  }, [gender]);
  return <>{icon}</>;
};
