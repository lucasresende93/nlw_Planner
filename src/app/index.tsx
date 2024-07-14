
//Minuto 1:27:02, habilitando status de loading no botão "Confirmar Viagem"

import { View, Text, Image, Keyboard, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { MapPin, Calendar as IconCalendar, Settings2, UserRoundPlus, ArrowRight, AtSign } from "lucide-react-native"
import { DateData } from 'react-native-calendars'
import dayjs from 'dayjs'

import { colors } from "@/styles/colors"

import { tripStorage } from '@/storage/trip'
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils"
import { validateInput } from '@/utils/validateInput'
import { tripServer } from '@/server/trip-server'

import { Input } from "@/components/input"
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import { Calendar } from '@/components/calendar'
import { GuestEmail } from '@/components/email'
import { router } from 'expo-router'
import { Loading } from '@/components/loading'



enum StepForm {
    TRIP_DETAILS = 1,
    ADD_EMAIL = 2,
}
enum MODAL {
    NONE = 0,
    CALENDAR = 1,
    GUESTS = 2,
}

export default function index() {
    //LOADING
    const [isCreateTripLoading, setIsCreateTripLoading] = useState(false)
    const [isGettingTrip, setIsGettingTrip] = useState(true)
    //Data
    const [stepForm, setStepForm] = useState(StepForm.TRIP_DETAILS)
    const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
    const [destination, setDestination] = useState('')
    const [emailToInvite, setEmailToInvite] = useState('')
    const [emailsToInvite, setEmailsToInvite] = useState<string[]>([])
    //Modal
    const [showModal, setShowModal] = useState(MODAL.NONE)

    function handleNextStepForm() {
        if (destination.trim().length === 0 || !selectedDates.startsAt || !selectedDates.endsAt) {
            return Alert.alert(
                "Detalhes da viagem",
                "Preencha todos os dados da viagem para seguir."
            )
        }

        if (destination.length < 4) {
            return Alert.alert(
                "Detalhes da viagem",
                "O destino deve ter pelo menos 4 caracteres."
            )
        }

        if (stepForm === StepForm.TRIP_DETAILS) {
            return setStepForm(StepForm.ADD_EMAIL)
        }
        Alert.alert("Nova viagem", "Confirmar viagem?", [
            {
                text: "Não",
                style: "cancel"
            },
            {
                text: "Sim",
                onPress: createTrip,

            },
        ])
    }

    function handleSelectDate(selectedDay: DateData) {
        const dates = calendarUtils.orderStartsAtAndEndsAt({
            startsAt: selectedDates.startsAt,
            endsAt: selectedDates.endsAt,
            selectedDay,
        })
        setSelectedDates(dates)
    }

    function handleRemoveEmail(emailToRemove: string) {
        setEmailsToInvite((prevState) =>
            prevState.filter((email) => email !== emailToRemove)
        )
    }

    function handleAddEmail() {
        if (!validateInput.email(emailToInvite)) {
            return Alert.alert("Convidado", "E-mail inválido")
        }

        const emailAlreadyExists = emailsToInvite.find((email) => email ===
            emailToInvite)

        if (emailAlreadyExists) {
            return Alert.alert("Convidado", "Este email já foi adicionado");
        }
        setEmailsToInvite((prevState) => [...prevState, emailToInvite])
        setEmailToInvite("")
    }

    async function saveTrip(tripId: string) {
        try {
            await tripStorage.save(tripId)
            router.navigate("/trip/" + tripId)
        }
        catch (error) {
            Alert.alert("Salvar imagem", "Erro ao salvar a viagem")
        }
    }

    async function createTrip() {
        try {
            setIsCreateTripLoading(true);

            const newTrip = await tripServer.create({
                destination,
                starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
                ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
                emails_to_invite: emailsToInvite,
            });

            Alert.alert("Nova viagem", "Viagem criada com sucesso!", [
                {
                    text: "Ok. Continuar",
                    onPress: () => saveTrip(newTrip.tripId)
                }
            ]);
        } catch (error) {
            console.log(error);
            setIsCreateTripLoading(false);
        }
    }


    async function getTrip() {
        try {
            const tripID = await tripStorage.get();

            if (!tripID) {
                return setIsCreateTripLoading(false);
            }
            const trip = await tripServer.getById(tripID);
            console.log(trip);

            if (trip) {

                return router.navigate("/trip/" + trip.id);
            }


        } catch (error) {
            setIsGettingTrip(false);
            console.log(error);
        }
    }

    useEffect(() => {
        getTrip()
    }, [])

    if (isGettingTrip) {
        return (
            <Loading />
        )
    }
    return (
        <View className='flex-1 items-center justify-center px-5'>
            <Image
                source={require('@/assets/logo.png')}
                className="h-8"
                resizeMode="contain"
            />

            <Image source={require('@/assets/bg.png')} className="absolute" />

            <Text className='text-zinc-400 font-regular text-center text-lg mt-3'>
                Convide seus amigos e planeja sua{"\n"}próxima viagem
            </Text>

            <View className='w-full bg-zinc-900 p-4 rounded-lg my-8 border border-zinc-800'>
                <Input>
                    <MapPin color={colors.zinc[400]} size={20} />
                    <Input.field placeholder='Para onde?' editable={stepForm === StepForm.TRIP_DETAILS}
                        value={destination}
                        onChangeText={setDestination} />
                </Input>


                <Input>
                    <IconCalendar color={colors.zinc[400]} size={20} />
                    <Input.field
                        placeholder='Quando?'
                        editable={stepForm === StepForm.TRIP_DETAILS}
                        onFocus={() => Keyboard.dismiss()}
                        showSoftInputOnFocus={false}
                        onPressIn={() =>
                            stepForm === StepForm.TRIP_DETAILS &&
                            setShowModal(MODAL.CALENDAR)}
                        value={selectedDates.formatDatesInText}
                    />
                </Input>


                {stepForm === StepForm.ADD_EMAIL &&
                    <>
                        <View className="border-b py-3 border-zinc-800">
                            <Button variant='secondary'
                                onPress={() => setStepForm(StepForm.TRIP_DETAILS)} >
                                <Button.Title>Alterar local/data</Button.Title>
                                <Settings2 color={colors.zinc[200]} size={20} />
                            </Button>
                        </View>


                        <Input>
                            <UserRoundPlus color={colors.zinc[400]} size={20} />
                            <Input.field placeholder='Quem estará na viagem?'
                                autoCorrect={false}
                                value={emailsToInvite.length > 0 ?
                                    `${emailsToInvite.length} pessoas convidadas`
                                    :
                                    ""

                                }
                                onPress={() => {
                                    Keyboard.dismiss()
                                    setShowModal(MODAL.GUESTS)
                                }
                                }
                                showSoftInputOnFocus={false}
                            />
                        </Input>
                    </>
                }

                <Button onPress={handleNextStepForm} isLoading={isCreateTripLoading}>
                    <Button.Title>
                        {
                            stepForm === StepForm.TRIP_DETAILS
                                ? 'Continuar'
                                : 'Confirmar Viagem'
                        }

                    </Button.Title>
                    <ArrowRight color={colors.lime[950]} size={20} />
                </Button>
            </View>
            <Text className='text-zinc-500 font-regular text-center text-base'>
                Ao planejar sua viagem pela plann.er você concorda com
                nossos
                <Text className='text-zinc-300 underline'> termos de uso e políticas de privacidade.</Text>
            </Text>

            <Modal
                title="Selecionar datas"
                subtitle='Selecione a data e ida da sua viagem'
                visible={showModal === MODAL.CALENDAR}
                onClose={() => { setShowModal(MODAL.NONE) }} >
                <View className='gap-4 mt-4'>
                    <Calendar
                        minDate={dayjs().toISOString()}
                        onDayPress={handleSelectDate}
                        markedDates={selectedDates.dates}
                    />
                    <Button onPress={() => setShowModal(MODAL.NONE)}>
                        <Button.Title> Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>

            <Modal
                title="Adicionar convidados"
                subtitle='Os convaidados irão receber e-mails para confirmar a participação na viagem.'
                visible={showModal === MODAL.GUESTS}
                onClose={() => { setShowModal(MODAL.NONE) }}
            >
                <View className='my-2 flex-wrap gap-2 border-b boerder-zinc-800 py-5 items-start'>
                    {
                        emailsToInvite.length > 0 ?
                            (
                                emailsToInvite.map((email) => (
                                    <GuestEmail key={email} email={email} onRemove={() => handleRemoveEmail(email)} />
                                ))
                            ) : (
                                <Text className='text-zinc-600 text-base font-regular'>
                                    Nenhum email adicionado.
                                </Text>
                            )
                    }
                </View>

                <View className='gap-4 mt-4'>
                    <Input variant='secundary'>
                        <AtSign color={colors.zinc[400]} size={20} />
                        <Input.field
                            placeholder='Digite o email do convidado'
                            keyboardType="email-address"
                            onChangeText={(text) => setEmailToInvite(text.toLowerCase())}
                            value={emailToInvite}
                        />
                    </Input>
                    <Button onPress={handleAddEmail}>
                        <Button.Title>Convidar</Button.Title>
                    </Button>
                </View>
            </Modal >

        </View >
    )
}