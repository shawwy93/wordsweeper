export default function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const v = props.variant ?? "default";
  const cls =
    "btn " +
    (v === "primary" ? "btnPrimary" : v === "danger" ? "btnDanger" : "");

  return (
    <button className={cls} onClick={props.onClick} type="button">
      {props.children}
    </button>
  );
}
