import "./conversation.css";

export interface CounselingRoomHeaderProps {
  title: string;
}

export function CounselingRoomHeader(props: CounselingRoomHeaderProps) {
  return (
    <div className="session-infobar">
      <h1>{props.title}</h1>
    </div>
  );
}
