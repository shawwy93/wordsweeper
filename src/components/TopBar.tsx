export default function TopBar(props: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div style={{ minWidth: 86 }}>{props.left}</div>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontWeight: 900 }}>{props.title}</div>
      </div>
      <div style={{ minWidth: 86, display: "flex", justifyContent: "flex-end" }}>
        {props.right}
      </div>
    </div>
  );
}
