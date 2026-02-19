import { useState } from 'react';
import styles from './Defense.module.css';
import Header from '../home/Header';
import ShadowBoxingTimer from '../tools/ShadowBoxingTimer';

interface Defense {
    onBack: () => void;
}

interface Fundamental {
    title: string;
    icon: string;
    description: string;
    points: string[];
}

interface Drill {
    id: string;
    title: string;
    duration: string;
    durationSeconds: number; // duration in seconds
    reps: string;
    numRounds: number; // number of rounds
    description: string;
    visualType: 'shadow' | 'line' | 'square' | 'circle';
}

interface KeyPoint {
    icon?: string;
    iconImage?: string;
    title: string;
    description: string;
}

interface Mistake {
    icon: string;
    title: string;
    description: string;
    fix: string;
}

interface Video {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnail?: string;
}

export default function DefenseLesson({ onBack }: Defense): JSX.Element {
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);

    const fundamentals: Fundamental[] = [
        {
            title: 'The Slip',
            icon: '↔️',
            description: 'Move your head off the centerline to let punches sail past. The most fundamental defensive movement in boxing.',
            points: [
                'Bend at the waist, not the neck',
                'Keep eyes on opponent',
                'Slip to the outside of jabs',
                'Return to guard immediately',
            ],
        },
        {
            title: 'Bob & Weave',
            icon: '🔄',
            description: 'Duck under hooks and power punches while creating devastating counter-punch angles.',
            points: [
                'Bend your knees, not your back',
                'Move in a U-shaped motion',
                'Keep hands up throughout',
                'Exit at an angle for counters',
            ],
        },
        {
            title: 'The Parry',
            icon: '🤚',
            description: 'Deflect incoming punches with subtle hand movements, creating instant counter opportunities.',
            points: [
                'Use minimal hand movements',
                'Redirect, don\'t absorb force',
                'Parry jabs with lead hand',
                'Counter immediately after',
            ],
        },
        {
            title: 'High Guard Block',
            icon: '🛡️',
            description: 'Use your gloves and arms to absorb punches when evasion isn\'t possible.',
            points: [
                'Tight elbows protect the body',
                'Gloves protect the head',
                'Absorb on gloves, not face',
                'Maintain vision through guard',
            ],
        },
        {
            title: 'The Roll',
            icon: '🌀',
            description: 'Rotate your shoulders to let hooks and overhands slide off your body. The signature move of counter-punchers.',
            points: [
                'Use shoulder rotation',
                'Let punches slide over',
                'Perfect for hooks and overhands',
                'Keep your chin tucked',
            ],
        },
    ];

    const drills: Drill[] = [
        {
            id: 'shadow-defense',
            title: 'Shadow Defense',
            duration: '2 Min',
            durationSeconds: 120,
            reps: '5 Rounds',
            numRounds: 5,
            description: 'Move, Step & Bounce. Practice all defensive movements without a partner. Visualize incoming punches and react accordingly.',
            visualType: 'shadow',
        },
        {
            id: 'line-drill',
            title: 'Line Drill',
            duration: '3 Min',
            durationSeconds: 180,
            reps: '4 Rounds',
            numRounds: 4,
            description: 'Stay inside the Line. Partner moves rope side to side, you slip under continuously. Builds timing and rhythm.',
            visualType: 'line',
        },
        {
            id: 'square-drill',
            title: 'Square Drill',
            duration: '3 Min',
            durationSeconds: 180,
            reps: '3 Rounds',
            numRounds: 3,
            description: 'Control each Corner. Move around the perimeter of an imaginary square, practicing pivots and angles at each corner.',
            visualType: 'square',
        },
        {
            id: 'pivot-drill',
            title: 'Pivot Drill',
            duration: '3 Min',
            durationSeconds: 180,
            reps: '4 Rounds',
            numRounds: 4,
            description: 'Practice Your Turns. Circle movement combined with defensive head movement. Creates angles for counters.',
            visualType: 'circle',
        },
    ];

    const keyPoints: KeyPoint[] = [
        {
            iconImage: '/icons/eye.png',
            title: 'Keep Your Eyes Open',
            description: 'Never close your eyes during defensive movements. You must see the punch to defend it and counter.',
        },
        {
            iconImage: '/icons/shield.png',
            title: 'Hands Stay Up',
            description: 'Your guard should return to position faster than it left. Never drop your hands during or after defense.',
        },
        {
            iconImage: '/icons/target.png',
            title: 'Counter Immediately',
            description: 'Every defensive movement should create a counter-punching opportunity. Defense without offense doesn\'t win fights.',
        },
        {
            iconImage: '/icons/alter.png',
            title: 'Stay Unpredictable',
            description: 'Mix up your defensive responses. Never develop predictable patterns that opponents can exploit.',
        },
        {
            iconImage: '/icons/cogwheel.png',
            title: 'Use Minimal Movement',
            description: 'Move just enough to avoid the punch. Excessive movement wastes energy and leaves you off-balance.',
        },
        {
            iconImage: '/icons/shoe.png',
            title: 'Move Your Feet',
            description: 'Every defensive movement should involve footwork. Step, pivot, or adjust your stance with each defense.',
        },
    ];

    const mistakes: Mistake[] = [
        {
            icon: '✗',
            title: 'Closing Your Eyes',
            description: 'The most dangerous habit in boxing. You can\'t defend what you can\'t see, and closing your eyes makes you vulnerable to follow-up punches.',
            fix: 'Keep your eyes open throughout every defensive movement. Watch your opponent\'s hands and shoulders to anticipate punches.',
        },
        {
            icon: '✗',
            title: 'Dropping Your Hands',
            description: 'Lowering your hands to slip or bob exposes your head and opens you up for devastating combinations.',
            fix: 'Keep your hands up at all times. Your gloves should protect your head even while your body is moving.',
        },
        {
            icon: '✗',
            title: 'Over-Slipping',
            description: 'Excessive head movement makes you slow and leaves you vulnerable. Moving too far off center wastes energy and limits counter opportunities.',
            fix: 'Move just enough to avoid the punch. The smallest movement that gets you off the centerline is the most effective.',
        },
        {
            icon: '✗',
            title: 'Forgetting Footwork',
            description: 'Defensive movements without footwork leave you in poor position and unable to counter or escape.',
            fix: 'Step with every defensive movement. Your feet should always move with your head and hands to maintain balance and create offensive angles.',
        },
        {
            icon: '✗',
            title: 'Predictable Patterns',
            description: 'Always slipping in the same direction or using the same defense becomes easy for opponents to read and punish.',
            fix: 'Mix up your defensive responses. Use different techniques against different punches and vary your patterns.',
        },
    ];

    const getVisualStyle = (visualType: string) => {
        switch (visualType) {
            case 'shadow':
                return styles.shadowVisual;
            case 'line':
                return styles.lineVisual;
            case 'square':
                return styles.squareVisual;
            case 'circle':
                return styles.circleVisual;
            default:
                return '';
        }
    };

    const videos: Video[] = [
        {
            id: 'slip',
            title: 'Slipping Fundamentals',
            description: 'Learn the proper mechanics of slipping with detailed form analysis and common corrections.',
            videoUrl: '/tutorial-videos/slip.mp4',
            thumbnail: '/slip-thumbnail.png',
        },
        {
            id: 'bob-weave',
            title: 'Bob & Weave Masterclass',
            description: 'Master ducking under hooks and creating counter-punch opportunities from defensive positions.',
            videoUrl: '/tutorial-videos/bob-weave.mp4',
            thumbnail: '/bob-weave-thumbnail.png',
        },
        {
            id: 'parry',
            title: 'Parrying Techniques',
            description: 'Deflect punches with minimal hand movements and create instant counter-punch angles.',
            videoUrl: '/tutorial-videos/parry.mp4',
            thumbnail: '/parry-thumbnail.png',
        },
        {
            id: 'defense-footwork',
            title: 'Defensive Footwork',
            description: 'Control distance and angles while maintaining perfect defensive positioning and balance.',
            videoUrl: '/tutorial-videos/defense-footwork.mp4',
            thumbnail: '/defense-footwork-thumbnail.png',
        },
    ];

    // Show timer if a drill is selected
    if (selectedDrill) {
        return (
            <ShadowBoxingTimer
                drillName={selectedDrill.title}
                roundDuration={selectedDrill.durationSeconds}
                numRounds={selectedDrill.numRounds}
                onBack={() => setSelectedDrill(null)}
            />
        );
    }

    return (
        <>
            <Header onBack={onBack} />
            <div className={styles.container}>
                {/* Header Section */}
                <section className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>BOXING</h1>
                    <h2 className={styles.subtitle}>DEFENSE</h2>
                    <p className={styles.tagline}>
                        Move better. Stay balanced. Control distance.
                    </p>
                </div>
            </section>

            {/* Defense Techniques Fundamentals */}
            <section className={styles.fundamentalsSection}>
                <h3 className={styles.sectionTitle}>Defense Techniques</h3>
                <p className={styles.sectionSubtitle}>Master these five essential defensive movements that every boxer must know.</p>
                <div className={styles.fundamentalsGrid}>
                    {fundamentals.map((fundamental) => (
                        <div key={fundamental.title} className={styles.fundamentalCard}>
                            <div className={styles.fundamentalHeader}>
                                <h4 className={styles.fundamentalTitle}>{fundamental.title}</h4>
                            </div>
                            <p className={styles.fundamentalDescription}>{fundamental.description}</p>
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

            {/* Training Drills Section */}
            <section className={styles.drillsSection}>
                <h3 className={styles.sectionTitle}>Training Drills</h3>
                <p className={styles.sectionSubtitle}>Practice these drills to develop muscle memory and defensive reflexes.</p>
                <div className={styles.drillsGrid}>
                    {drills.map((drill) => (
                        <div key={drill.id} className={styles.drillCard}>
                            <div className={`${styles.drillVisual} ${getVisualStyle(drill.visualType)}`} />
                            <h4 className={styles.drillTitle}>{drill.title}</h4>
                            <div className={styles.drillMeta}>
                                <span className={styles.drillTime}>⏱️ {drill.duration}</span>
                                <span className={styles.drillReps}>🔄 {drill.reps}</span>
                            </div>
                            <p className={styles.drillDescription}>{drill.description}</p>
                            <button
                                className={styles.startButton}
                                onClick={() => setSelectedDrill(drill)}
                            >
                                Start Drill
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Key Points Section */}
            <section className={styles.keyPointsSection}>
                <h3 className={styles.sectionTitle}>Key Defensive Principles</h3>
                <div className={styles.keyPointsGrid}>
                    {keyPoints.map((point, idx) => (
                        <div key={idx} className={styles.keyPointCard}>
                            <div className={styles.keyPointIcon}>
                                {point.iconImage ? (
                                    <img src={point.iconImage} alt={point.title} className={styles.keyPointImage} />
                                ) : (
                                    point.icon
                                )}
                            </div>
                            <h4 className={styles.keyPointTitle}>{point.title}</h4>
                            <p className={styles.keyPointDescription}>{point.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Common Mistakes Section */}
            <section className={styles.mistakesSection}>
                <h3 className={styles.sectionTitle}>Common Mistakes</h3>
                <p className={styles.sectionSubtitle}>Avoid these critical errors that leave you vulnerable and slow your progress.</p>
                <div className={styles.mistakesGrid}>
                    {mistakes.map((mistake, idx) => (
                        <div key={idx} className={styles.mistakeCard}>
                            <div className={styles.mistakeHeader}>
                                <span className={styles.mistakeIcon}>{mistake.icon}</span>
                                <h4 className={styles.mistakeTitle}>{mistake.title}</h4>
                            </div>
                            <p className={styles.mistakeDescription}>{mistake.description}</p>
                            <div className={styles.fixSection}>
                                <span className={styles.fixLabel}>The Fix</span>
                                <p className={styles.fixText}>{mistake.fix}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Video Demonstrations Section */}
            <section className={styles.videoSection}>
                <h3 className={styles.sectionTitle}>Video Demonstrations</h3>
                <p className={styles.sectionSubtitle}>Watch professional breakdowns of each technique in action.</p>
                <div className={styles.videoGrid}>
                    {videos.map((video) => (
                        <div key={video.id} className={styles.videoCard}>
                            <div 
                                className={styles.videoThumbnail} 
                                onClick={() => setSelectedVideo(video)}
                                style={video.thumbnail ? { backgroundImage: `url(${video.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                            >
                                <div className={styles.playIcon} />
                            </div>
                            <div className={styles.videoInfo}>
                                <h4 className={styles.videoTitle}>{video.title}</h4>
                                <p className={styles.videoDescription}>{video.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Video Modal */}
            {selectedVideo && (
                <div className={styles.videoModal} onClick={() => setSelectedVideo(null)}>
                    <div className={styles.videoModalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setSelectedVideo(null)}>✕</button>
                        <video 
                            controls 
                            autoPlay 
                            className={styles.videoPlayer}
                            src={selectedVideo.videoUrl}
                        >
                            Your browser does not support the video tag.
                        </video>
                        <h3 className={styles.videoModalTitle}>{selectedVideo.title}</h3>
                        <p className={styles.videoModalDescription}>{selectedVideo.description}</p>
                    </div>
                </div>
            )}
            </div>
        </>
    );
}
