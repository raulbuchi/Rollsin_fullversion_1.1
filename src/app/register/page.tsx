
"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlaceHolderImages } from '@/lib/placeholder-images'

function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/[^\d]/g, '');
  if (digits.length !== 14) return false;
  
  if (/^(\d)\1+$/.test(digits)) return false;
  
  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const checkDigits = digits.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== Number(checkDigits.charAt(0))) return false;
  
  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(checkDigits.charAt(1))) return false;
  
  return true;
}

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const registerSchema = z.object({
  restName: z.string().min(1, "Nome do Restaurante é obrigatório"),
  jurName: z.string().min(1, "Razão Social é obrigatória"),
  cnpj: z.string()
    .min(1, "CNPJ é obrigatório")
    .refine((val) => isValidCNPJ(val), { message: "O CNPJ inserido não é válido" }),
  type: z.string().min(1, "Tipo de Restaurante é obrigatório"),
  resp: z.string().min(1, "Nome do Responsável é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  pass: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  address: z.string().min(1, "Endereço é obrigatório"),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterRestaurantPage() {
  const router = useRouter()
  const logoImg = PlaceHolderImages.find(img => img.id === 'gp-logo')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      restName: "",
      jurName: "",
      cnpj: "",
      type: "",
      resp: "",
      email: "",
      phone: "",
      pass: "",
      address: "",
    }
  })

  const onSubmit = (data: RegisterFormValues) => {
    // Redirect to login after "success"
    router.push('/login')
  }

  return (
    <div className="min-h-screen py-12 px-4 flex justify-center items-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center border-b pb-8">
          <div className="mx-auto w-16 h-16 relative mb-4">
            <Image
              src={logoImg?.imageUrl || 'https://picsum.photos/seed/gp-logo/400/400'}
              alt="Gastro Prozesse Logo"
              fill
              className="object-contain"
              data-ai-hint="company logo"
            />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Cadastro de Restaurante</CardTitle>
          <CardDescription>Digitalizando a Excelência na sua gestão</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="restName">Nome do Restaurante</Label>
                <Input id="restName" placeholder="Ex: Cantina do Chef" {...register("restName")} />
                {errors.restName && <p className="text-xs text-red-500">{errors.restName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurName">Razão Social</Label>
                <Input id="jurName" placeholder="Ex: LTDA Restaurante ME" {...register("jurName")} />
                {errors.jurName && <p className="text-xs text-red-500">{errors.jurName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="cnpj" 
                      placeholder="00.000.000/0000-00" 
                      maxLength={18}
                      {...field} 
                      onChange={(e) => {
                        field.onChange(formatCNPJ(e.target.value));
                      }}
                    />
                  )}
                />
                {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Restaurante</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="italiana">Italiana</SelectItem>
                        <SelectItem value="japonesa">Japonesa</SelectItem>
                        <SelectItem value="brasileira">Brasileira</SelectItem>
                        <SelectItem value="hamburgueria">Hamburgueria</SelectItem>
                        <SelectItem value="pizza">Pizzaria</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="resp">Nome do Responsável</Label>
                <Input id="resp" placeholder="Nome Completo" {...register("resp")} />
                {errors.resp && <p className="text-xs text-red-500">{errors.resp.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input id="email" type="email" placeholder="contato@restaurante.com.br" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" placeholder="(00) 00000-0000" {...register("phone")} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Senha Admin</Label>
                <Input id="pass" type="password" {...register("pass")} />
                {errors.pass && <p className="text-xs text-red-500">{errors.pass.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input id="address" placeholder="Rua, Número, Bairro, Cidade - UF" {...register("address")} />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-semibold mt-4">Concluir Registro</Button>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já possui conta? <Link href="/login" className="text-primary font-semibold hover:underline">Voltar para Login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
