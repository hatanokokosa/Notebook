use bitvec::prelude::*;
use blind_watermark::prelude::{
    get_wm_len, WatermarkConfig, WatermarkConfigBuilder, WatermarkMode, YCrBrAMat,
};
use image::{DynamicImage, ImageReader, Rgba32FImage};
use std::env;
use std::path::Path;
use std::process;

type Result<T> = std::result::Result<T, String>;

#[derive(Debug)]
enum Command {
    Embed(EmbedArgs),
    Extract(ExtractArgs),
    Len(LenArgs),
    Help,
}

#[derive(Debug)]
struct EmbedArgs {
    input: String,
    output: String,
    payload: String,
    seed: Option<u64>,
    strength: i32,
}

#[derive(Debug)]
struct ExtractArgs {
    input: String,
    length: usize,
    seed: Option<u64>,
    strength: i32,
}

#[derive(Debug)]
struct LenArgs {
    payload: String,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        process::exit(1);
    }
}

fn run() -> Result<()> {
    match parse_args(env::args().skip(1).collect())? {
        Command::Embed(args) => {
            embed_watermark_string(
                &args.input,
                &args.output,
                &args.payload,
                args.seed,
                args.strength,
            )
            .map_err(|error| format!("failed to embed blind watermark: {error}"))?;
            println!(
                "{{\"ok\":true,\"mode\":\"embed\",\"length\":{}}}",
                get_wm_len(args.payload.as_bytes())
            );
        }
        Command::Extract(args) => {
            let extracted =
                extract_watermark_string(&args.input, args.length, args.seed, args.strength)
                    .map_err(|error| format!("failed to extract blind watermark: {error}"))?;
            println!("{}", json_object("extract", &extracted));
        }
        Command::Len(args) => {
            println!(
                "{{\"ok\":true,\"mode\":\"len\",\"length\":{}}}",
                get_wm_len(args.payload.as_bytes())
            );
        }
        Command::Help => {
            print_help();
        }
    }

    Ok(())
}

fn parse_args(args: Vec<String>) -> Result<Command> {
    if args.is_empty() || matches!(args[0].as_str(), "-h" | "--help" | "help") {
        return Ok(Command::Help);
    }

    let command = args[0].clone();
    let mut parser = ArgParser::new(args.into_iter().skip(1).collect());

    match command.as_str() {
        "embed" => Ok(Command::Embed(EmbedArgs {
            input: parser.required("--input")?,
            output: parser.required("--output")?,
            payload: parser.required("--payload")?,
            seed: parser.optional_seed()?,
            strength: parser.optional_strength()?,
        })),
        "extract" => Ok(Command::Extract(ExtractArgs {
            input: parser.required("--input")?,
            length: parser
                .required("--length")?
                .parse()
                .map_err(|_| "--length must be a positive integer".to_string())?,
            seed: parser.optional_seed()?,
            strength: parser.optional_strength()?,
        })),
        "len" => Ok(Command::Len(LenArgs {
            payload: parser.required("--payload")?,
        })),
        other => Err(format!("unknown command `{other}`\n\n{}", usage())),
    }
}

struct ArgParser {
    args: Vec<String>,
}

impl ArgParser {
    fn new(args: Vec<String>) -> Self {
        Self { args }
    }

    fn required(&mut self, key: &str) -> Result<String> {
        self.take(key)
            .ok_or_else(|| format!("missing required argument `{key}`\n\n{}", usage()))
    }

    fn optional_seed(&mut self) -> Result<Option<u64>> {
        self.take("--seed")
            .map(|seed| normalize_seed(&seed))
            .transpose()
    }

    fn optional_strength(&mut self) -> Result<i32> {
        self.take("--strength")
            .map(|strength| {
                let parsed: i32 = strength
                    .parse()
                    .map_err(|_| "--strength must be a positive integer".to_string())?;

                if parsed <= 0 {
                    return Err("--strength must be greater than 0".to_string());
                }

                Ok(parsed)
            })
            .transpose()
            .map(|strength| strength.unwrap_or(15))
    }

    fn take(&mut self, key: &str) -> Option<String> {
        let index = self.args.iter().position(|arg| arg == key)?;
        if index + 1 >= self.args.len() {
            return None;
        }

        self.args.drain(index..=index + 1).last()
    }
}

fn watermark_config(seed: Option<u64>, strength: i32) -> Result<WatermarkConfig> {
    let mut builder = WatermarkConfigBuilder::default();

    builder.strength_2(strength);

    if let Some(seed) = seed {
        builder.mode(WatermarkMode::Strategy(seed));
    }

    builder
        .build()
        .map_err(|error| format!("failed to build watermark config: {error}"))
}

fn embed_watermark_string<T: AsRef<Path>>(
    img_in: T,
    img_out: T,
    watermark: &str,
    seed: Option<u64>,
    strength: i32,
) -> Result<()> {
    let img = ImageReader::open(img_in)
        .map_err(|error| error.to_string())?
        .decode()
        .map_err(|error| error.to_string())?
        .into_rgba32f();
    let ycbcr: YCrBrAMat = img.into();
    let config = watermark_config(seed, strength)?;
    let processed = ycbcr
        .add_padding()
        .dwt()
        .cut()
        .embed_watermark_bits(watermark.as_bytes().as_bits::<Lsb0>(), &config)
        .assemble()
        .idwt()
        .remove_padding();
    let processed_image: Rgba32FImage = processed.into();
    let output_image: DynamicImage = processed_image.into();

    output_image
        .to_rgb8()
        .save(img_out)
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn extract_watermark_string<T: AsRef<Path>>(
    img_in: T,
    wm_len: usize,
    seed: Option<u64>,
    strength: i32,
) -> Result<String> {
    let img = ImageReader::open(img_in)
        .map_err(|error| error.to_string())?
        .decode()
        .map_err(|error| error.to_string())?
        .into_rgba32f();
    let ycbcr: YCrBrAMat = img.into();
    let config = watermark_config(seed, strength)?;
    let bits = ycbcr
        .add_padding()
        .dwt()
        .cut()
        .extract_watermark_bits(wm_len, &config);
    let bytes = bits.into_vec();

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

fn normalize_seed(seed: &str) -> Result<u64> {
    if seed.is_empty() {
        return Err("--seed must not be empty".to_string());
    }

    if seed.bytes().all(|byte| byte.is_ascii_digit()) {
        return seed
            .parse()
            .map_err(|_| "--seed is too large for u64".to_string());
    }

    Ok(fnv1a64(seed.as_bytes()))
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    const OFFSET_BASIS: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x100000001b3;

    bytes.iter().fold(OFFSET_BASIS, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(PRIME)
    })
}

fn json_object(mode: &str, payload: &str) -> String {
    format!(
        "{{\"ok\":true,\"mode\":\"{}\",\"payload\":\"{}\"}}",
        escape_json(mode),
        escape_json(payload)
    )
}

fn escape_json(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());

    for character in value.chars() {
        match character {
            '"' => escaped.push_str("\\\""),
            '\\' => escaped.push_str("\\\\"),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            character if character.is_control() => {
                escaped.push_str(&format!("\\u{:04x}", character as u32));
            }
            character => escaped.push(character),
        }
    }

    escaped
}

fn print_help() {
    println!("{}", usage());
}

fn usage() -> &'static str {
    r#"Usage:
  kokosa-blind-watermark embed --input <png> --output <image> --payload <text> [--seed <text>] [--strength <int>]
  kokosa-blind-watermark extract --input <image> --length <bits> [--seed <text>] [--strength <int>]
  kokosa-blind-watermark len --payload <text>

The image pipeline feeds this tool normalized PNG files. Text seeds are mapped
to u64 with FNV-1a. Lower strength is less visible but less robust. Build the
Linux binary with the x86_64-unknown-linux-musl target for Vercel."#
}
