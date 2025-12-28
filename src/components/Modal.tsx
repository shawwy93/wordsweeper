import Button from "./Button";

export default function Modal(props: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="card modal">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>{props.title}</div>
          <div style={{ width: 120 }}>
            <Button onClick={props.onClose}>Close</Button>
          </div>
        </div>
        <div style={{ height: 10 }} />
        {props.children}
      </div>
    </div>
  );
}
