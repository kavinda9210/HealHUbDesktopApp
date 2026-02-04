import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const HealHubLogo = () => {
    const heartbeatAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const floatAnim1 = useRef(new Animated.Value(0)).current;
    const floatAnim2 = useRef(new Animated.Value(0)).current;
    const floatAnim3 = useRef(new Animated.Value(0)).current;
    const dot1Anim = useRef(new Animated.Value(0.4)).current;
    const dot2Anim = useRef(new Animated.Value(0.4)).current;
    const dot3Anim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Heartbeat animation
        const createHeartbeat = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(heartbeatAnim, {
                        toValue: 1.2,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(heartbeatAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(heartbeatAnim, {
                        toValue: 1.15,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(heartbeatAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1000),
                ])
            );
        };

        // Logo pulse animation
        const createPulse = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.03,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        // Floating animations
        const createFloat1 = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim1, {
                        toValue: -8,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim1, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const createFloat2 = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim2, {
                        toValue: 6,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim2, {
                        toValue: 0,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const createFloat3 = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim3, {
                        toValue: -5,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim3, {
                        toValue: 0,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        // Loading dots animation
        const createLoadingDots = () => {
            const dotAnimation = (animValue: Animated.Value, delay: number) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(animValue, {
                            toValue: 0.4,
                            duration: 500,
                            useNativeDriver: true,
                        }),
                        Animated.delay(1000 - delay),
                    ])
                );
            };

            dotAnimation(dot1Anim, 0).start();
            dotAnimation(dot2Anim, 200).start();
            dotAnimation(dot3Anim, 400).start();
        };

        // Start animations
        createHeartbeat().start();
        createPulse().start();
        createFloat1().start();
        createFloat2().start();
        createFloat3().start();
        createLoadingDots();

    }, [heartbeatAnim, pulseAnim, fadeAnim, floatAnim1, floatAnim2, floatAnim3, dot1Anim, dot2Anim, dot3Anim]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Animated.View style={[
                styles.logoContainer,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                {/* Animated Heart */}
                <Animated.View style={[
                    styles.heartContainer,
                    { transform: [{ scale: heartbeatAnim }] }
                ]}>
                    <View style={styles.heartShape}>
                        <Text style={styles.crossIcon}>+</Text>
                    </View>
                </Animated.View>

                <Text style={styles.logoText}>HealHub</Text>
                <Text style={styles.tagline}>Caring for You</Text>

                <View style={styles.trustIndicators}>
                    <Animated.View style={[
                        styles.trustDot,
                        { opacity: dot1Anim }
                    ]} />
                    <Animated.View style={[
                        styles.trustDot,
                        { opacity: dot2Anim }
                    ]} />
                    <Animated.View style={[
                        styles.trustDot,
                        { opacity: dot3Anim }
                    ]} />
                </View>
            </Animated.View>

            {/* Floating circles */}
            <Animated.View style={[
                styles.softCircle,
                styles.circle1,
                { transform: [{ translateY: floatAnim1 }] }
            ]} />
            <Animated.View style={[
                styles.softCircle,
                styles.circle2,
                { transform: [{ translateY: floatAnim2 }] }
            ]} />
            <Animated.View style={[
                styles.softCircle,
                styles.circle3,
                { transform: [{ translateY: floatAnim3 }] }
            ]} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 20,
    },
    logoContainer: {
        backgroundColor: '#2E8B57',
        padding: 30,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        width: 220,
        height: 220,
        shadowColor: '#2E8B57',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 4,
        borderColor: '#fff',
    },
    heartContainer: {
        marginBottom: 12,
    },
    heartShape: {
        backgroundColor: '#fff',
        width: 50,
        height: 45,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
    },
    crossIcon: {
        color: '#2E8B57',
        fontSize: 24,
        fontWeight: 'bold',
        transform: [{ rotate: '-45deg' }],
        textAlign: 'center',
    },
    logoText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: 1,
    },
    tagline: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    trustIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trustDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        marginHorizontal: 4,
    },
    softCircle: {
        position: 'absolute',
        borderRadius: 50,
        opacity: 0.15,
    },
    circle1: {
        width: 60,
        height: 60,
        backgroundColor: '#90EE90',
        top: -10,
        right: -15,
    },
    circle2: {
        width: 40,
        height: 40,
        backgroundColor: '#87CEEB',
        bottom: 10,
        left: -10,
    },
    circle3: {
        width: 25,
        height: 25,
        backgroundColor: '#F0E68C',
        top: 40,
        left: -5,
    },
});

export default HealHubLogo; 
