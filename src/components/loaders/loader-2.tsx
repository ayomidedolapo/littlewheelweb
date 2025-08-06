import React from "react";
import style from "./loader-2.module.css";

const Loader2 = ({ className }: { className?: string }) => {
  return (
    <div className={style["loader"] + ` ${className}`}>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
      <div className={style["bar1"]}></div>
    </div>
  );
};

export default Loader2;
