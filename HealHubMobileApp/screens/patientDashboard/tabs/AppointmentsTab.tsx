import React from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function AppointmentsTab({
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
}: AppointmentsTabProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'sinhala' ? 'වෛද්‍යවරයෙක් වෙන්කරගන්න' : language === 'tamil' ? 'மருத்துவரை முன்பதிவு செய்' : 'Book a doctor'}
        </Text>

        <Text style={[styles.itemSub, { color: colors.subtext, marginTop: 0 }]}>{appointmentsHint}</Text>

        <AlertMessage
          visible={appointmentError.length > 0}
          mode="inline"
          variant="error"
          message={appointmentError}
          onClose={() => setAppointmentError('')}
          style={{ marginTop: 12 }}
        />

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{language === 'sinhala' ? 'වෛද්‍යවරයා' : language === 'tamil' ? 'மருத்துவர்' : 'Doctor'}</Text>

        <TextInput
          value={doctorQuerySpecialty}
          onChangeText={(v) => {
            setDoctorQuerySpecialty(v);
            setSelectedDoctor(null);
          }}
          placeholder={language === 'sinhala' ? 'විශේෂත්වය අනුව සොයන්න' : language === 'tamil' ? 'சிறப்பு மூலம் தேடு' : 'Search by specialty'}
          placeholderTextColor={colors.subtext}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        />

        <TextInput
          value={doctorQueryName}
          onChangeText={(v) => {
            setDoctorQueryName(v);
            setSelectedDoctor(null);
          }}
          placeholder={language === 'sinhala' ? 'නම අනුව සොයන්න' : language === 'tamil' ? 'பெயர் மூலம் தேடு' : 'Search by doctor name'}
          placeholderTextColor={colors.subtext}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, marginTop: 10 }]}
        />

        {!!doctorLoadError && <Text style={[styles.noteText, { color: colors.subtext }]}>{doctorLoadError}</Text>}

        <View style={styles.pillsWrap}>
          {doctors.map((d) => {
            const active = selectedDoctor?.doctor_id === d.doctor_id;
            return (
              <TouchableOpacity
                key={String(d.doctor_id)}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedDoctor(d);
                  setAppointmentError('');
                }}
                style={[
                  styles.pillChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? (mode === 'dark' ? '#0b2a22' : '#f0f9ff') : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.pillChipText, { color: active ? colors.primary : colors.subtext }]}>{`Dr. ${d.full_name}`}</Text>
                <Text style={[styles.pillChipSub, { color: colors.subtext }]}>{d.specialization}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{language === 'sinhala' ? 'දිනය' : language === 'tamil' ? 'தேதி' : 'Date'}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setShowDatePicker(true);
            setAppointmentError('');
          }}
          style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <Text style={[styles.pickerBtnText, { color: appointmentDate ? colors.text : colors.subtext }]}>
            <Ionicons name="calendar-outline" size={16} color={appointmentDate ? colors.text : colors.subtext} /> {formatDateLabel(appointmentDate)}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={{ marginTop: 8 }}>
            <DateTimePicker
              value={appointmentDate ?? new Date()}
              mode="date"
              onChange={onDateChange}
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
            />
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{language === 'sinhala' ? 'වේලාව' : language === 'tamil' ? 'நேரம்' : 'Time'}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setShowTimePicker(true);
            setAppointmentError('');
          }}
          style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <Text style={[styles.pickerBtnText, { color: appointmentTime ? colors.text : colors.subtext }]}>
            <Ionicons name="time-outline" size={16} color={appointmentTime ? colors.text : colors.subtext} /> {formatTimeLabel(appointmentTime)}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View style={{ marginTop: 8 }}>
            <DateTimePicker
              value={appointmentTime ?? new Date()}
              mode="time"
              onChange={onTimeChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{language === 'sinhala' ? 'හේතුව' : language === 'tamil' ? 'காரணம்' : 'Reason'}</Text>
        <TextInput
          value={appointmentReason}
          onChangeText={setAppointmentReason}
          placeholder={language === 'sinhala' ? 'උදා: රෑෂ් පරීක්ෂාව' : language === 'tamil' ? 'உ.தா: ரேஷ் பரிசோதனை' : 'e.g., rash check'}
          placeholderTextColor={colors.subtext}
          style={[styles.input, styles.inputMultiline, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          multiline
        />

        <TouchableOpacity activeOpacity={0.85} style={[styles.primaryAction, { backgroundColor: colors.primary }]} onPress={onBookAppointment}>
          <Text style={styles.primaryActionText}>{bookAppointmentLabel}</Text>
        </TouchableOpacity>

        <Text style={[styles.noteText, { color: colors.subtext }]}>
          {language === 'sinhala'
            ? 'සටහන: වෙන්කිරීම සැබෑ දත්ත (API) මත පදනම්ව සිදු වේ.'
            : language === 'tamil'
              ? 'குறிப்பு: முன்பதிவு உண்மை தரவு (API) மூலம் செய்யப்படுகிறது.'
              : 'Note: Booking uses real backend data (API).'}
        </Text>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'ඔබගේ වෙන්කිරීම්' : language === 'tamil' ? 'உங்கள் நியமனங்கள்' : 'Your appointments'}</Text>

        {appointments.length === 0 ? (
          <Text style={[styles.cardText, { color: colors.subtext }]}>
            {language === 'sinhala' ? 'තවම වෙන්කිරීම් නැත.' : language === 'tamil' ? 'இன்னும் நியமனங்கள் இல்லை.' : 'No appointments yet.'}
          </Text>
        ) : (
          appointments.map((a) => {
            const doc = doctorById[a.doctor_id];
            const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${a.doctor_id}`;
            return (
              <View key={String(a.appointment_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{doctorName}</Text>
                  <Text style={[styles.itemSub, { color: colors.subtext }]}>
                    {String(a.appointment_date)} • {String(a.appointment_time).slice(0, 5)}
                    {a.symptoms ? ` • ${a.symptoms}` : ''}
                  </Text>
                </View>
                <View style={[styles.smallPill, { borderColor: colors.primary }]}>
                  <Text style={[styles.smallPillText, { color: colors.primary }]}>{String(a.status)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
