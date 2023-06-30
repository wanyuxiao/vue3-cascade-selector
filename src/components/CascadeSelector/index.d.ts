type Nodes = Array<{ code: string; name: string; children?: Nodes }>;
type Node = { code: string; name: string; children?: Nodes };
export type Option = { code: string; name: string; [key: string]: any };
export type Value = Nodes;
