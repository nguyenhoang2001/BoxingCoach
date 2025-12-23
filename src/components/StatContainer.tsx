import React from "react";

export interface StatContainerProps {
    title: string;
    value: string | number;
    backgroundColor?: string;
    iconColor?: string;
    size?: number | string;
    iconSize?: number;
    className?: string;
    style?: React.CSSProperties;
}

const StatContainer: React.FC<StatContainerProps> = ({
    title,
    value,
    backgroundColor = "#34120F", // dark brown by default
    iconColor = "#FF3B30", // red by default
    size = 160,
    iconSize = 40,
    className,
    style,
}) => {
    const resolvedSize =
        typeof size === "number" ? `${size}px` : size;

    const containerStyle: React.CSSProperties = {
        background: backgroundColor,
        color: "#fff",
        width: resolvedSize,
        height: resolvedSize,
        borderRadius: 24,
        padding: 16,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 8,
        ...style,
    };

    const iconStyle: React.CSSProperties = {
        width: iconSize,
        height: iconSize,
        borderRadius: "50%",
        background: iconColor,
    };

    const titleStyle: React.CSSProperties = {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
    };

    const valueStyle: React.CSSProperties = {
        margin: 0,
        fontSize: 28,
        fontWeight: 800,
        lineHeight: 1,
    };

    return (
        <div style={containerStyle} className={className} role="group" aria-label={`${title} stat`}>
            <div style={iconStyle} aria-hidden />
            <div style={{ marginTop: 8 }}>
                <div style={titleStyle}>{title}</div>
                <div style={valueStyle}>{value}</div>
            </div>
        </div>
    );
};

export default StatContainer;

/*
Usage example:


<StatContainer
    title="Velocity"
    value="100m/s"
    backgroundColor="#2B0E0C"
    iconColor="#FF3B30"
    size={180}
    iconSize={44}
/>
*/