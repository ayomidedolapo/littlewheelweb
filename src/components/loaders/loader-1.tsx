import React from "react";
import style from "./loader-1.module.css";

const Loader1 = ({ className }: { className?: string }) => {
  return (
    <div className={style["dot-spinner"] + ` ${className}`}>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      <div className={style["dot-spinner__dot"]}></div>
      {/* <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div>
      <div class="dot-spinner__dot"></div> */}
    </div>
  );
};

export default Loader1;
