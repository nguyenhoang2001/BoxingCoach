import { useState } from 'react';
import styles from './Footwork.module.css';

interface Footwork {
    onBack: () => void;
}

interface Fundamental {
    title: string;
    icon: string;
    points: string[];
}

interface BasicMovement {
    id: string;
    title: string;
    image: string;
    steps: string[];
}

interface Drill {
    id: string;
    title: string;
    image: string;
    duration: string;
    description: string;
}

export default function FootworkLesson({ onBack }: Footwork): JSX.Element {
    const [selectedDrill, setSelectedDrill] = useState<string | null>(null);

    const fundamentals: Fundamental[] = [
        {
            title: 'Balance',
            icon: '⚖️',
            points: ['Proper Stance', 'Feet Positioning', 'Stay Centered'],
        },
        {
            title: 'Distance Control',
            icon: '📏',
            points: ['Close the Gap', 'Exit Safely', 'Range Awareness'],
        },
        {
            title: 'Movement Efficiency',
            icon: '⚡',
            points: ['Quick Steps', 'Smooth Transitions', 'Save Energy'],
        },
    ];

    const basicMovements: BasicMovement[] = [
        {
            id: 'forward-backward',
            title: 'Forward & Backward',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="40" fill="%23e74c3c"/%3E%3Crect x="85" y="50" width="30" height="60" fill="%23e74c3c"/%3E%3Crect x="70" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3Crect x="110" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3C/svg%3E',
            steps: [
                '1. Step with lead foot',
                '2. Follow with rear foot',
                '3. Keep your stance',
            ],
        },
        {
            id: 'left-right-lateral',
            title: 'Left & Right (Lateral)',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="40" fill="%23e74c3c"/%3E%3Crect x="85" y="50" width="30" height="60" fill="%23e74c3c"/%3E%3Crect x="70" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3Crect x="110" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3C/svg%3E',
            steps: [
                '1. Step left, step right',
                '2. Stay balanced',
                "3. Don't cross your feet",
            ],
        },
        {
            id: 'pivot',
            title: 'Pivot',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="40" fill="%23e74c3c"/%3E%3Crect x="85" y="50" width="30" height="60" fill="%23e74c3c"/%3E%3Crect x="70" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3Crect x="110" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3C/svg%3E',
            steps: [
                '1. Pivot on lead foot',
                '2. Turn your hips',
                '3. Keep your guard up',
            ],
        },
        {
            id: 'circle-movement',
            title: 'Circle Movement',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="40" fill="%23e74c3c"/%3E%3Crect x="85" y="50" width="30" height="60" fill="%23e74c3c"/%3E%3Crect x="70" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3Crect x="110" y="110" width="20" height="40" fill="%23e74c3c"/%3E%3C/svg%3E',
            steps: [
                '1. Move in circular pattern',
                '2. Stay on the balls of your feet',
                '3. Maintain distance',
            ],
        },
    ];

    const drills: Drill[] = [
        {
            id: 'shadow-footwork',
            title: 'Shadow Footwork',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Cpath d="M50,100 Q100,50 150,100 Q100,150 50,100" fill="%23e74c3c" opacity="0.8"/%3E%3Ccircle cx="100" cy="100" r="20" fill="%23e74c3c"/%3E%3C/svg%3E',
            duration: '2 Min',
            description: 'Move, Step & Bounce',
        },
        {
            id: 'line-drill',
            title: 'Line Drill',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Cline x1="100" y1="20" x2="100" y2="180" stroke="%23e74c3c" stroke-width="2"/%3E%3Ccircle cx="100" cy="100" r="15" fill="%23e74c3c"/%3E%3C/svg%3E',
            duration: '3 Min',
            description: 'Stay inside the Line',
        },
        {
            id: 'square-drill',
            title: 'Square Drill',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Crect x="40" y="40" width="120" height="120" fill="none" stroke="%23e74c3c" stroke-width="2"/%3E%3Ccircle cx="100" cy="100" r="15" fill="%23e74c3c"/%3E%3C/svg%3E',
            duration: '3 Min',
            description: 'Control each Corner',
        },
        {
            id: 'pivot-drill',
            title: 'Pivot Drill',
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23222" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="60" fill="none" stroke="%23e74c3c" stroke-width="2" stroke-dasharray="5,5"/%3E%3Ccircle cx="100" cy="100" r="15" fill="%23e74c3c"/%3E%3C/svg%3E',
            duration: '3 Min',
            description: 'Pracrice Your Turns',
        },
    ];

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <button className={styles.backButton} onClick={onBack}>
                ← Back to Lessons
            </button>

            {/* Header Section */}
            <section className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>BOXING</h1>
                    <h2 className={styles.subtitle}>FOOTWORK</h2>
                    <p className={styles.tagline}>
                        Move better. Stay balanced, Control distance.
                    </p>
                </div>
            </section>
            {/* Fundamentals Section */}
            <section className={styles.fundamentalsSection}>
                <h3 className={styles.sectionTitle}>Footwork Fundamentals</h3>
                <div className={styles.fundamentalsGrid}>
                    {fundamentals.map((fundamental) => (
                        <div key={fundamental.title} className={styles.fundamentalCard}>
                            <h4 className={styles.fundamentalTitle}>
                                <span className={styles.fundamentalIcon}>{fundamental.icon}</span>
                                {fundamental.title}
                            </h4>
                            <ul className={styles.fundamentalPoints}>
                                {fundamental.points.map((point, idx) => (
                                    <li key={idx}>
                                        <span className={styles.bullet}>●</span>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Basic Movements Section */}
            <section className={styles.movementsSection}>
                <h3 className={styles.sectionTitle}>Basic Movements</h3>
                <div className={styles.movementsGrid}>
                    {basicMovements.map((movement) => (
                        <div key={movement.id} className={styles.movementCard}>
                            <img
                                src={movement.image}
                                alt={movement.title}
                                className={styles.movementImage}
                            />
                            <h4 className={styles.movementTitle}>{movement.title}</h4>
                            <ul className={styles.movementSteps}>
                                {movement.steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Drills Section */}
            <section className={styles.drillsSection}>
                <h3 className={styles.sectionTitle}>Footwork Drills</h3>
                <div className={styles.drillsGrid}>
                    {drills.map((drill) => (
                        <div key={drill.id} className={styles.drillCard}>
                            <img
                                src={drill.image}
                                alt={drill.title}
                                className={styles.drillImage}
                            />
                            <h4 className={styles.drillTitle}>{drill.title}</h4>
                            <div className={styles.drillMeta}>
                                <span className={styles.duration}>⏱️ {drill.duration}</span>
                                <span className={styles.description}>{drill.description}</span>
                            </div>
                            <button
                                className={styles.startButton}
                                onClick={() => setSelectedDrill(drill.id)}
                            >
                                Start Drill
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
