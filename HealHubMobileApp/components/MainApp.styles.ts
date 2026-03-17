import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
  testAlarmAfterAlertsButton: {
    marginTop: 14,
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testAlarmAfterAlertsButtonText: {
    color: '#ffffff',
    fontWeight: '900',
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
  alarmInputs: {
    marginBottom: 12,
  },
  alarmInputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  alarmInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#0f172a',
    fontWeight: '700',
  },
  alarmRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  alarmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  alarmButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  alarmButtonOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  alarmOutlineText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 13,
  },
  alarmNote: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
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
