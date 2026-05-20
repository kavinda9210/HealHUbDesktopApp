import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AlertMessage from '../../../components/alerts/AlertMessage';
import { styles } from '../styles';
import type { AppointmentRow, DoctorRow } from '../types';

export type AppointmentsTabProps = {
  language: string;
  colors: any;
  mode: 'light' | 'dark';
  appointmentsHint: string;
  bookAppointmentLabel: string;
  doctorQuerySpecialty: string;
  setDoctorQuerySpecialty: (v: string) => void;
  doctorQueryName: string;
  setDoctorQueryName: (v: string) => void;
  doctors: DoctorRow[];
  doctorLoadError: string;
  selectedDoctor: DoctorRow | null;
  setSelectedDoctor: (d: DoctorRow | null) => void;
  appointmentDate: Date | null;
  appointmentTime: Date | null;
  appointmentReason: string;
  setAppointmentReason: (v: string) => void;
  appointmentError: string;
  setAppointmentError: (v: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (v: boolean) => void;
  formatDateLabel: (d: Date | null) => string;
  formatTimeLabel: (t: Date | null) => string;
  onDateChange: (_event: DateTimePickerEvent, date?: Date) => void;
  onTimeChange: (_event: DateTimePickerEvent, time?: Date) => void;
  onBookAppointment: () => void;
  appointments: AppointmentRow[];
  doctorById: Record<number, DoctorRow>;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AppointmentsTab(props: AppointmentsTabProps) {
  const {
    language,
    colors,
    mode,
    appointmentsHint,
    bookAppointmentLabel,
    doctorQuerySpecialty,
    setDoctorQuerySpecialty,
    doctorQueryName,
    setDoctorQueryName,
    doctors,
    doctorLoadError,
    selectedDoctor,
    setSelectedDoctor,
    appointmentDate,
    appointmentTime,
    appointmentReason,
    setAppointmentReason,
    appointmentError,
    setAppointmentError,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    formatDateLabel,
    formatTimeLabel,
    onDateChange,
    onTimeChange,
    onBookAppointment,
    appointments,
    doctorById,
  } = props;

  // --- Local state for doctor selection modal -------------------------------
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  // Local copies of search queries inside the modal (optional, but good UX)
  const [modalSpecialty, setModalSpecialty] = useState('');
  const [modalName, setModalName] = useState('');

  // --- Filter doctors based on modal search fields --------------------------
  const filteredDoctors = useMemo(() => {
    let filtered = [...doctors];
    if (modalSpecialty.trim()) {
      const specialtyLower = modalSpecialty.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.specialization.toLowerCase().includes(specialtyLower)
      );
    }
    if (modalName.trim()) {
      const nameLower = modalName.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.full_name.toLowerCase().includes(nameLower)
      );
    }
    return filtered;
  }, [doctors, modalSpecialty, modalName]);

  // --- Helper to display selected doctor ------------------------------------
  const getSelectedDoctorDisplay = () => {
    if (!selectedDoctor) return null;
    return `Dr. ${selectedDoctor.full_name} (${selectedDoctor.specialization})`;
  };

  // --- UI styling helpers ---------------------------------------------------
  const cardElevation = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: mode === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  };

  const renderInputWithIcon = (
    iconName: keyof typeof Ionicons.glyphMap,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        marginBottom: 16,
      }}
    >
      <Ionicons name={iconName} size={20} color={colors.subtext} style={{ marginRight: 10 }} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.subtext}
        autoCapitalize={autoCapitalize || 'none'}
        style={{
          flex: 1,
          color: colors.text,
          fontSize: 16,
          paddingVertical: 14,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={18} color={colors.subtext} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDateTimePicker = (
    label: string,
    value: Date | null,
    show: boolean,
    setShow: (v: boolean) => void,
    onChange: (event: DateTimePickerEvent, date?: Date) => void,
    format: (d: Date | null) => string,
    iconName: keyof typeof Ionicons.glyphMap,
    modeType: 'date' | 'time'
  ) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={iconName} size={20} color={colors.primary} />
          <Text style={{ color: value ? colors.text : colors.subtext, fontSize: 16 }}>
            {value ? format(value) : (modeType === 'date' ? 'Select date' : 'Select time')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.subtext} />
      </TouchableOpacity>
      {show && (
        <View style={{ marginTop: 12, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' }}>
          <DateTimePicker
            value={value ?? new Date()}
            mode={modeType}
            onChange={onChange}
            minimumDate={modeType === 'date' ? new Date() : undefined}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={mode}
          />
        </View>
      )}
    </View>
  );

  // --- Centered Doctor Selection Modal --------------------------------------
  const renderDoctorModal = () => (
    <Modal
      visible={showDoctorModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowDoctorModal(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: screenWidth * 0.9,
            maxHeight: screenHeight * 0.8,
            backgroundColor: colors.card,
            borderRadius: 28,
            overflow: 'hidden',
            ...cardElevation,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              {language === 'sinhala' ? 'වෛද්‍යවරයෙක් තෝරන්න' :
               language === 'tamil' ? 'மருத்துவரைத் தேர்ந்தெடுக்கவும்' :
               'Select a doctor'}
            </Text>
            <TouchableOpacity onPress={() => setShowDoctorModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Search inputs inside modal */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {renderInputWithIcon(
              'search-outline',
              language === 'sinhala' ? 'විශේෂත්වය අනුව සොයන්න' : language === 'tamil' ? 'சிறப்பு மூலம் தேடு' : 'Search by specialty',
              modalSpecialty,
              setModalSpecialty
            )}
            {renderInputWithIcon(
              'person-outline',
              language === 'sinhala' ? 'නම අනුව සොයන්න' : language === 'tamil' ? 'பெயர் மூலம் தேடு' : 'Search by doctor name',
              modalName,
              setModalName
            )}
          </View>

          {/* Doctor list */}
          <FlatList
            data={filteredDoctors}
            keyExtractor={(item) => String(item.doctor_id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Ionicons name="search-outline" size={48} color={colors.subtext} />
                <Text style={{ color: colors.subtext, textAlign: 'center' }}>
                  {doctorLoadError ||
                    (language === 'sinhala' ? 'වෛද්‍යවරුන් හමු නොවීය' :
                     language === 'tamil' ? 'மருத்துவர்கள் எதுவும் இல்லை' :
                     'No doctors found')}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedDoctor?.doctor_id === item.doctor_id;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedDoctor(item);
                    setShowDoctorModal(false);
                    setAppointmentError('');
                    // Reset modal search fields for next use
                    setModalSpecialty('');
                    setModalName('');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    gap: 12,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSelected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={24} color={isSelected ? '#fff' : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Dr. {item.full_name}</Text>
                    <Text style={{ fontSize: 13, color: colors.subtext }}>{item.specialization}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />

          {/* Clear selection button */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedDoctor(null);
                setShowDoctorModal(false);
                setModalSpecialty('');
                setModalName('');
              }}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {language === 'sinhala' ? 'තෝරාගත් වෛද්‍යවරයා ඉවත් කරන්න' :
                 language === 'tamil' ? 'தேர்ந்தெடுக்கப்பட்ட மருத்துவரை அகற்று' :
                 'Clear selected doctor'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // --- Main render ----------------------------------------------------------
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
    >
      {/* Booking Card */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginBottom: 24,
          ...cardElevation,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="calendar" size={26} color={colors.primary} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
            {language === 'sinhala' ? 'වෛද්‍යවරයෙක් වෙන්කරගන්න' : language === 'tamil' ? 'மருத்துவரை முன்பதிவு செய்' : 'Book a doctor'}
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: colors.subtext, marginBottom: 16, lineHeight: 20 }}>
          {appointmentsHint}
        </Text>

        {/* Error Alert */}
        {appointmentError.length > 0 && (
          <View
            style={{
              backgroundColor: '#fee2e2',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color="#e74c3c" />
              <Text style={{ color: '#c0392b', fontSize: 13, flex: 1 }}>{appointmentError}</Text>
            </View>
            <TouchableOpacity onPress={() => setAppointmentError('')}>
              <Ionicons name="close" size={18} color="#c0392b" />
            </TouchableOpacity>
          </View>
        )}

        {/* Doctor selection button (opens modal) */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
          {language === 'sinhala' ? 'වෛද්‍යවරයා' : language === 'tamil' ? 'மருத்துவர்' : 'Doctor'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setShowDoctorModal(true);
            // Pre-populate modal search with existing filters (optional)
            setModalSpecialty(doctorQuerySpecialty);
            setModalName(doctorQueryName);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            <Text style={{ color: selectedDoctor ? colors.text : colors.subtext, fontSize: 16, flex: 1 }}>
              {selectedDoctor
                ? `Dr. ${selectedDoctor.full_name} (${selectedDoctor.specialization})`
                : (language === 'sinhala' ? 'වෛද්‍යවරයෙක් තෝරන්න' :
                   language === 'tamil' ? 'மருத்துவரைத் தேர்ந்தெடுக்கவும்' :
                   'Select a doctor')}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.subtext} />
        </TouchableOpacity>

        {/* Date & Time Pickers */}
        {renderDateTimePicker(
          language === 'sinhala' ? 'දිනය' : language === 'tamil' ? 'தேதி' : 'Date',
          appointmentDate, showDatePicker, setShowDatePicker, onDateChange, formatDateLabel, 'calendar-outline', 'date'
        )}
        {renderDateTimePicker(
          language === 'sinhala' ? 'වේලාව' : language === 'tamil' ? 'நேரம்' : 'Time',
          appointmentTime, showTimePicker, setShowTimePicker, onTimeChange, formatTimeLabel, 'time-outline', 'time'
        )}

        {/* Reason Input */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
          {language === 'sinhala' ? 'හේතුව' : language === 'tamil' ? 'காரணம்' : 'Reason'}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.background,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            marginBottom: 24,
          }}
        >
          <Ionicons name="clipboard-outline" size={20} color={colors.subtext} style={{ marginTop: 14, marginRight: 10 }} />
          <TextInput
            value={appointmentReason}
            onChangeText={setAppointmentReason}
            placeholder={language === 'sinhala' ? 'උදා: රෑෂ් පරීක්ෂාව' : language === 'tamil' ? 'உ.தா: ரேஷ் பரிசோதனை' : 'e.g., rash check'}
            placeholderTextColor={colors.subtext}
            multiline
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 16,
              paddingVertical: 14,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Book Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onBookAppointment}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 40,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            ...cardElevation,
          }}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{bookAppointmentLabel}</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 20 }}>
          {language === 'sinhala'
            ? 'සටහන: වෙන්කිරීම සැබෑ දත්ත (API) මත පදනම්ව සිදු වේ.'
            : language === 'tamil'
              ? 'குறிப்பு: முன்பதிவு உண்மை தரவு (API) மூலம் செய்யப்படுகிறது.'
              : 'Note: Booking uses real backend data (API).'}
        </Text>
      </View>

      {/* Appointments List Card */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          ...cardElevation,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="list-outline" size={24} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {language === 'sinhala' ? 'ඔබගේ වෙන්කිරීම්' : language === 'tamil' ? 'உங்கள் நியமனங்கள்' : 'Your appointments'}
          </Text>
        </View>

        {appointments.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
            <Ionicons name="calendar-outline" size={48} color={colors.subtext} />
            <Text style={{ color: colors.subtext, fontSize: 16, textAlign: 'center' }}>
              {language === 'sinhala' ? 'තවම වෙන්කිරීම් නැත.' : language === 'tamil' ? 'இன்னும் நியமனங்கள் இல்லை.' : 'No appointments yet.'}
            </Text>
          </View>
        ) : (
          appointments.map((a) => {
            const doc = doctorById[a.doctor_id];
            const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${a.doctor_id}`;
            const statusColor = (() => {
              const s = a.status.toLowerCase();
              if (s === 'confirmed') return '#2ecc71';
              if (s === 'pending') return '#f39c12';
              if (s === 'cancelled') return '#e74c3c';
              return colors.primary;
            })();
            return (
              <View
                key={a.appointment_id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{doctorName}</Text>
                  <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>
                    {a.appointment_date} • {a.appointment_time.slice(0, 5)}
                    {a.symptoms ? ` • ${a.symptoms}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: statusColor + '20',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 40,
                    borderWidth: 0.5,
                    borderColor: statusColor,
                  }}
                >
                  <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                    {a.status}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Centered Modal */}
      {renderDoctorModal()}
    </ScrollView>
  );
}