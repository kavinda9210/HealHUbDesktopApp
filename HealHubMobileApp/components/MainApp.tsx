import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import AlertMessage, { AlertVariant } from './alerts/AlertMessage';

type MainAppProps = {
  onLogout?: () => void;
  onOpenPatientDashboard?: () => void;
};

const MainApp: React.FC<MainAppProps> = ({ onLogout, onOpenPatientDashboard }) => {
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const alertTimer = useRef<NodeJS.Timeout | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertVariant, setAlertVariant] = useState<AlertVariant>('info');
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (variant: AlertVariant) => {
    if (alertTimer.current) {
      clearTimeout(alertTimer.current);
      alertTimer.current = null;
    }

    setAlertVariant(variant);
    setAlertVisible(true);

    if (variant === 'success') {
      setAlertTitle(language === 'sinhala' ? 'සාර්ථකයි' : language === 'tamil' ? 'வெற்றி' : 'Success');
      setAlertMessage(language === 'sinhala' ? 'ඇලර්ට් පණිවිඩය සාර්ථක ලෙස පෙන්වයි.' : language === 'tamil' ? 'எச்சரிக்கை செய்தி வெற்றிகரமாக காட்டப்பட்டது.' : 'Alert message shown successfully.');
    } else if (variant === 'error') {
      setAlertTitle(language === 'sinhala' ? 'දෝෂයක්' : language === 'tamil' ? 'பிழை' : 'Error');
      setAlertMessage(language === 'sinhala' ? 'මෙය පරීක්ෂණ දෝෂ ඇලර්ට් එකක්.' : language === 'tamil' ? 'இது சோதனை பிழை எச்சரிக்கை.' : 'This is a test error alert.');
    } else if (variant === 'warning') {
      setAlertTitle(language === 'sinhala' ? 'අවවාදය' : language === 'tamil' ? 'எச்சரிக்கை' : 'Warning');
      setAlertMessage(language === 'sinhala' ? 'මෙය පරීක්ෂණ අවවාද ඇලර්ට් එකක්.' : language === 'tamil' ? 'இது சோதனை எச்சரிக்கை.' : 'This is a test warning alert.');
    } else {
      setAlertTitle(language === 'sinhala' ? 'තොරතුරු' : language === 'tamil' ? 'தகவல்' : 'Info');
      setAlertMessage(language === 'sinhala' ? 'මෙය පරීක්ෂණ තොරතුරු ඇලර්ට් එකක්.' : language === 'tamil' ? 'இது சோதனை தகவல் எச்சரிக்கை.' : 'This is a test info alert.');
    }

    alertTimer.current = setTimeout(() => {
      setAlertVisible(false);
    }, 2500);
  };

  const features = [
    { icon: '👨‍⚕️', title: 'Doctor Appointments', color: '#E8F5E9' },
    { icon: '💊', title: 'Medicine Reminder', color: '#E3F2FD' },
    { icon: '📊', title: 'Health Tracking', color: '#FFF3E0' },
    { icon: '🏥', title: 'Hospital Finder', color: '#F3E5F5' },
    { icon: '📝', title: 'Medical Records', color: '#E0F2F1' },
    { icon: '🚨', title: 'Emergency', color: '#FFEBEE' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <AlertMessage
        visible={alertVisible}
        variant={alertVariant}
        mode="toast"
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.greeting}>
            {language === 'sinhala' ? 'ආයුබෝවන්!' : 
             language === 'tamil' ? 'வணக்கம்!' : 
             'Hello!'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLanguage(language === 'english' ? 'sinhala' : 'english')}
            >
              <Text style={styles.languageButtonText}>
                {language === 'english' ? 'සිංහල' : 
                 language === 'sinhala' ? 'தமிழ்' : 
                 'English'}
              </Text>
            </TouchableOpacity>

            {!!onLogout && (
              <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>
                  {language === 'sinhala' ? 'පිටවීම' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.welcomeMessage}>{t('healthcare')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {!!onOpenPatientDashboard && (
          <View style={styles.dashboardCtaWrap}>
            <TouchableOpacity style={styles.dashboardCtaButton} activeOpacity={0.85} onPress={onOpenPatientDashboard}>
              <Text style={styles.dashboardCtaTitle}>
                {language === 'sinhala'
                  ? 'රෝගී පුවරුව බලන්න'
                  : language === 'tamil'
                    ? 'நோயாளர் டாஷ்போர்டை காண்க'
                    : 'View Patient Dashboard'}
              </Text>
              <Text style={styles.dashboardCtaSubtitle}>
                {language === 'sinhala'
                  ? 'Home / Appointment / Profile ටැබ් පරීක්ෂා කරන්න'
                  : language === 'tamil'
                    ? 'Home / Appointment / Profile டாப்களை சோதிக்கவும்'
                    : 'Test Home / Appointment / Profile tabs'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.testAlertsSection}>
          <Text style={styles.sectionTitle}>
            {language === 'sinhala' ? 'ඇලර්ට් පරීක්ෂා කිරීම' :
             language === 'tamil' ? 'எச்சரிக்கை சோதனை' :
             'Test Alerts'}
          </Text>

          <View style={styles.testAlertsRow}>
            <TouchableOpacity style={[styles.testAlertButton, styles.testAlertSuccess]} onPress={() => showAlert('success')}>
              <Text style={styles.testAlertButtonText}>Success</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.testAlertButton, styles.testAlertInfo]} onPress={() => showAlert('info')}>
              <Text style={styles.testAlertButtonText}>Info</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.testAlertsRow}>
            <TouchableOpacity style={[styles.testAlertButton, styles.testAlertWarning]} onPress={() => showAlert('warning')}>
              <Text style={styles.testAlertButtonText}>Warning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.testAlertButton, styles.testAlertError]} onPress={() => showAlert('error')}>
              <Text style={styles.testAlertButtonText}>Error</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>
            {language === 'sinhala' ? 'වේගවතුරු ක්‍රියාමාර්ග' :
             language === 'tamil' ? 'விரைவு செயல்கள்' :
             'Quick Actions'}
          </Text>
          
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <Text style={styles.featureIconText}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>
            {language === 'sinhala' ? 'ඉදිරි රැස්වීම්' :
             language === 'tamil' ? 'வரவிருக்கும் நிகழ்வுகள்' :
             'Upcoming Appointments'}
          </Text>
          
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <Text style={styles.appointmentTitle}>
                {language === 'sinhala' ? 'ඩොක්ටර් ජයසිංහ සමග සාකච්ඡාව' :
                 language === 'tamil' ? 'டாக்டர் ஜெயசிங்குடன் பேச்சுவார்த்தை' :
                 'Consultation with Dr. Jayasinghe'}
              </Text>
              <Text style={styles.appointmentTime}>10:30 AM</Text>
            </View>
            <Text style={styles.appointmentDate}>
              {language === 'sinhala' ? 'දෙසැම්බර් 15, 2024' :
               language === 'tamil' ? 'டிசம்பர் 15, 2024' :
               'December 15, 2024'}
            </Text>
          </View>
        </View>

        <View style={styles.medicationSection}>
          <Text style={styles.sectionTitle}>
            {language === 'sinhala' ? 'මතක් කිරීම්' :
             language === 'tamil' ? 'நினைவூட்டல்கள்' :
             'Medication Reminders'}
          </Text>
          
          <View style={styles.medicationCard}>
            <Text style={styles.medicationText}>
              {language === 'sinhala' ? 'පෙරේතමෝල් - අඩෑම 2:00 PM' :
               language === 'tamil' ? 'பாராசிட்டமோல் - மதியம் 2:00 மணி' :
               'Paracetamol - Due at 2:00 PM'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>
            {language === 'sinhala' ? 'මුල්පිටුව' :
             language === 'tamil' ? 'முகப்பு' :
             'Home'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navText}>
            {language === 'sinhala' ? 'වෙලාව' :
             language === 'tamil' ? 'அட்டவணை' :
             'Schedule'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>
            {language === 'sinhala' ? 'පැතිකඩ' :
             language === 'tamil' ? 'சுயவிவரம்' :
             'Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  languageButton: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  languageButtonText: {
    color: '#2E8B57',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  testAlertsSection: {
    marginBottom: 26,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dashboardCtaWrap: {
    marginBottom: 16,
  },
  dashboardCtaButton: {
    backgroundColor: '#2E8B57',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dashboardCtaTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  dashboardCtaSubtitle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  testAlertsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  testAlertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testAlertButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  testAlertSuccess: {
    backgroundColor: '#16a34a',
  },
  testAlertInfo: {
    backgroundColor: '#2563eb',
  },
  testAlertWarning: {
    backgroundColor: '#f59e0b',
  },
  testAlertError: {
    backgroundColor: '#dc2626',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActions: {
    marginBottom: 30,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureIconText: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  upcomingSection: {
    marginBottom: 30,
  },
  appointmentCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B57',
    flex: 1,
    marginRight: 12,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
  },
  medicationSection: {
    marginBottom: 30,
  },
  medicationCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
  },
  medicationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
});

export default MainApp;