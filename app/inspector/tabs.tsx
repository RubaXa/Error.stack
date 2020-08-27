import React from 'react';

export type TabsProps = {
	data: Array<{
		title: string;
		badge?: number | string;
		children: JSX.Element;
	}>;
};

export function Tabs(props: TabsProps) {
	const [idx, setActiveIdx] = React.useState(0);

	return (
		<div className="tabs">
			<div className="tabs-list">
				{props.data.map((tab, i) => (
					<div
						key={i}
						className={`tab-title ${i === idx}`}
						onClick={() => {
							setActiveIdx(i);
						}}
					>
						<span>{tab.title}</span>
						{tab.badge && <div className="tab-badge">{tab.badge}</div>}
					</div>
				))}
			</div>

			<div className="tab-content">{props.data[idx].children}</div>
		</div>
	);
}
