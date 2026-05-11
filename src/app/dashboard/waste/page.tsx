
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Camera, 
  Scale, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  XCircle,
  CameraOff,
  TrendingUp
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type WasteType = 'Vencido/Estragado' | 'Retorno da Mesa' | 'Produção Excessiva';

interface WasteRecord {
  id: string;
  type: WasteType;
  description: string;
  date: string;
  photoUrl: string;
  weight?: number;
  justification?: string;
  restaurantId: string;
}

export default function FoodWastePage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const restaurantId = 'gp-001';

  const [activeTab, setActiveTab] = useState<WasteType>('Vencido/Estragado');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [justification, setJustification] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Queries
  const wasteQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'restaurants', restaurantId, 'wasteRecords'),
      orderBy('date', 'desc'),
      limit(10)
    );
  }, [db, user]);

  const { data: recentWaste, isLoading } = useCollection<WasteRecord>(wasteQuery);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  const chartQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'restaurants', restaurantId, 'wasteRecords'),
      where('date', '>=', thirtyDaysAgo),
      orderBy('date', 'asc')
    );
  }, [db, user, thirtyDaysAgo]);

  const { data: chartDataRaw } = useCollection<WasteRecord>(chartQuery);

  const chartData = useMemo(() => {
    if (!chartDataRaw) return [];
    
    // Create a map of the last 30 days
    const daysMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daysMap.set(format(d, 'dd/MM'), 0);
    }

    chartDataRaw.forEach(record => {
      if (record.weight) {
        const dateKey = format(new Date(record.date), 'dd/MM');
        if (daysMap.has(dateKey)) {
          daysMap.set(dateKey, daysMap.get(dateKey)! + record.weight);
        }
      }
    });

    return Array.from(daysMap.entries()).map(([date, weight]) => ({
      date,
      weight: Number(weight.toFixed(2))
    }));
  }, [chartDataRaw]);

  useEffect(() => {
    if (isCapturing) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Erro na Câmera',
            description: 'Por favor, habilite as permissões de câmera no seu navegador.',
          });
        }
      };
      getCameraPermission();
    } else {
      // Stop camera stream when not capturing
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCapturing, toast]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        setIsCapturing(false);
      }
    }
  };

  const handleSaveWaste = () => {
    if (!db || !user) return;
    
    addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'wasteRecords'), {
      type: activeTab,
      description: description,
      weight: parseFloat(weight) || 0,
      justification: justification,
      photoUrl: photo || '',
      date: new Date().toISOString(),
      restaurantId
    });

    toast({
      title: "Registro Salvo",
      description: `Desperdício do tipo ${activeTab} registrado com sucesso.`,
    });

    // Reset fields
    setDescription('');
    setWeight('');
    setJustification('');
    setPhoto(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold font-headline text-primary">Food Waste Control</h1>
        <p className="text-muted-foreground">Monitoramento e redução de desperdício alimentar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Evolução */}
        <Card className="lg:col-span-3 shadow-md">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução do Desperdício (Últimos 30 dias)
            </CardTitle>
            <CardDescription>Acompanhe o volume de perdas em kg ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dx={-10}
                  unit="kg"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value} kg`, 'Desperdício']}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Formulário de Registro */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-primary" />
              Registrar Desperdício
            </CardTitle>
            <CardDescription>Documente a perda para análise e melhoria de processos.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="Vencido/Estragado" onValueChange={(val) => setActiveTab(val as WasteType)}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="Vencido/Estragado">Vencido/Estragado</TabsTrigger>
                <TabsTrigger value="Retorno da Mesa">Retorno Mesa</TabsTrigger>
                <TabsTrigger value="Produção Excessiva">Prod. Excessiva</TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descrição do Item</Label>
                    <Input 
                      placeholder="O que foi desperdiçado?" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {activeTab !== 'Retorno da Mesa' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Scale className="w-4 h-4" /> Peso Estimado (kg)
                      </Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                  )}

                  {activeTab === 'Retorno da Mesa' && (
                    <div className="space-y-2">
                      <Label>Justificativa do Cliente / Motivo</Label>
                      <Textarea 
                        placeholder="Ex: Prato frio, cabelo, erro no pedido..." 
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-xs text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-orange-500" />
                    Registros fotográficos ajudam na identificação de falhas na cadeia de suprimentos ou preparo.
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Registro Fotográfico</Label>
                  <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center">
                    {photo ? (
                      <>
                        <Image src={photo} alt="Waste capture" fill className="object-cover" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => setPhoto(null)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : isCapturing ? (
                      <div className="w-full h-full relative">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                          <Button onClick={takePhoto} className="rounded-full h-12 w-12 bg-primary">
                            <Camera className="w-6 h-6" />
                          </Button>
                          <Button variant="secondary" onClick={() => setIsCapturing(false)} className="rounded-full h-12 w-12">
                            <XCircle className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-background rounded-full shadow-sm">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <Button variant="outline" onClick={() => setIsCapturing(true)} className="gap-2">
                          Abrir Câmera
                        </Button>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {!hasCameraPermission && isCapturing && (
                    <Alert variant="destructive">
                      <AlertTitle>Acesso Negado</AlertTitle>
                      <AlertDescription>
                        Permita o acesso à câmera para tirar fotos dos registros de desperdício.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button className="w-full font-bold gap-2 h-12" onClick={handleSaveWaste} disabled={!description && activeTab !== 'Retorno da Mesa'}>
              <CheckCircle2 className="w-5 h-5" /> SALVAR REGISTRO DE PERDA
            </Button>
          </CardFooter>
        </Card>

        {/* Histórico Recente */}
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Últimas Perdas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentWaste?.map(item => (
                <div key={item.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg border text-xs">
                  <div className="w-12 h-12 relative rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {item.photoUrl ? (
                      <Image src={item.photoUrl} alt="Waste" fill className="object-cover" />
                    ) : (
                      <CameraOff className="w-4 h-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-[8px] uppercase">{item.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(item.date), 'dd/MM HH:mm')}</span>
                    </div>
                    <p className="font-bold truncate mt-1">{item.description || 'Sem descrição'}</p>
                    {item.weight > 0 && <p className="text-primary font-mono font-bold">{item.weight} kg</p>}
                    {item.justification && <p className="italic text-muted-foreground line-clamp-1">"{item.justification}"</p>}
                  </div>
                </div>
              ))}
              {recentWaste?.length === 0 && (
                <div className="text-center py-10 text-muted-foreground italic">
                  Nenhum registro recente.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-secondary/10 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase font-bold text-secondary">Dica de Sustentabilidade</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>Reduzir perdas em 10% pode aumentar seu lucro bruto em até 5%.</p>
              <p className="font-bold text-secondary">Meta Rolls-In: CMV de perdas &lt; 2% do faturamento.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
